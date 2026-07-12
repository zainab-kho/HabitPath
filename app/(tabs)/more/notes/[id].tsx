// @/app/(tabs)/more/notes/[id].tsx
// note editor — used for both new notes (id === 'new') and existing ones.
// no page title, just a back button + date, matching the spec.
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {
    createNote,
    loadNotes,
    updateNoteContent,
} from '@/lib/supabase/queries/notes';
import { NoteBlock, NoteBlockType } from '@/types/Note';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { formatDisplayDate } from '@/utils/dateUtils';

const makeBlock = (type: NoteBlockType = 'body', text = ''): NoteBlock => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    text,
    ...(type === 'check' ? { checked: false } : {}),
});

// list-ish types continue onto the next line when you hit enter
const CONTINUING_TYPES: NoteBlockType[] = ['bullet', 'number', 'check'];

// neighbouring body blocks collapse into one journal-style multiline input
const mergeAdjacentBodies = (list: NoteBlock[]): NoteBlock[] => {
    const out: NoteBlock[] = [];
    for (const b of list) {
        const last = out[out.length - 1];
        if (last && last.type === 'body' && b.type === 'body') {
            out[out.length - 1] = { ...last, text: last.text.length ? `${last.text}\n${b.text}` : b.text };
        } else {
            out.push(b);
        }
    }
    return out.length ? out : [makeBlock()];
};

// NOTE: no lineHeight here on purpose — lineHeight on an iOS multiline
// TextInput misplaces the cursor and clips wrapped lines (RN #28012)
const BLOCK_TEXT_STYLE: Record<NoteBlockType, object> = {
    h1: { fontFamily: 'p2', fontSize: 24 },
    h2: { fontFamily: 'p2', fontSize: 20 },
    h3: { fontFamily: 'p2', fontSize: 17 },
    body: { fontFamily: 'p3', fontSize: 15 },
    bullet: { fontFamily: 'p3', fontSize: 15 },
    number: { fontFamily: 'p3', fontSize: 15 },
    quote: { fontFamily: 'p3', fontSize: 15, fontStyle: 'italic', opacity: 0.75 },
    check: { fontFamily: 'p3', fontSize: 15 },
};

// formatting toolbar options
const FORMAT_OPTIONS: { type: NoteBlockType; label: string }[] = [
    { type: 'h1', label: 'H1' },
    { type: 'h2', label: 'H2' },
    { type: 'h3', label: 'H3' },
    { type: 'body', label: 'Aa' },
    { type: 'bullet', label: '•' },
    { type: 'number', label: '1.' },
    { type: 'check', label: '☑' },
    { type: 'quote', label: '❝' },
];

export default function NoteEditorPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();
    const isNew = id === 'new';

    const [noteId, setNoteId] = useState<string | null>(isNew ? null : id);
    const [title, setTitle] = useState('');
    const [blocks, setBlocks] = useState<NoteBlock[]>([makeBlock()]);
    const [noteDate, setNoteDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(!isNew);
    const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null);

    const [copied, setCopied] = useState(false);

    // measured pixel width of the editor column. On iOS a multiline TextInput
    // inside a ScrollView is NOT bounded by its parent's width — it lays the text
    // out on one endless line and clips it. Giving the box a real pixel width
    // forces wrapping; native multiline auto-grow then handles height on its own.
    const [editorWidth, setEditorWidth] = useState(0);

    const inputRefs = useRef<Record<string, TextInput | null>>({});
    // pending focus after inserting/removing a block
    const pendingFocusId = useRef<string | null>(null);

    // ─── load existing note ────────────────────────────────────────────────────
    useEffect(() => {
        if (isNew || !user) return;
        (async () => {
            try {
                const all = await loadNotes(user.id);
                const note = all.find(n => n.id === id);
                if (note) {
                    setTitle(note.title);
                    // merge legacy per-line body blocks into journal-style paragraphs
                    setBlocks(mergeAdjacentBodies(note.blocks));
                    setNoteDate(new Date(note.updatedAt));
                }
            } catch (err) {
                console.error('Error loading note:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [id, isNew, user]);

    // ─── autosave (debounced) ──────────────────────────────────────────────────
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef({ title, blocks });
    latest.current = { title, blocks };
    const noteIdRef = useRef(noteId);
    noteIdRef.current = noteId;
    // guards against double-create when two saves race before the id lands
    const creatingRef = useRef(false);

    const persist = useCallback(async () => {
        if (!user) return;
        const { title: t, blocks: b } = latest.current;
        const hasContent = t.trim().length > 0 || b.some(x => x.text.trim().length > 0);

        try {
            if (!noteIdRef.current) {
                if (!hasContent || creatingRef.current) return; // don't create empty notes
                creatingRef.current = true;
                const created = await createNote(user.id, {
                    title: t,
                    blocks: b,
                    folderId: (folderId as string) ?? null,
                });
                noteIdRef.current = created.id;
                setNoteId(created.id);
            } else {
                await updateNoteContent(noteIdRef.current, user.id, t, b);
            }
        } catch (err) {
            console.error('Error saving note:', err);
        } finally {
            creatingRef.current = false;
        }
    }, [user, folderId]);

    const scheduleSave = useCallback(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(persist, 800);
    }, [persist]);

    // save whatever's pending when leaving the page
    const handleBack = useCallback(async () => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        await persist();
        router.back();
    }, [persist, router]);

    // ─── block editing ─────────────────────────────────────────────────────────

    // Enter never reaches the text (submitBehavior="submit"), so no '\n' round-trips
    // through the controlled value — that round-trip was what made the cursor jump.
    // Newlines can still arrive via paste; split those into blocks.
    const updateBlockText = (blockId: string, text: string) => {
        // body blocks are journal-style multiline inputs — newlines live inside
        // them natively, so no splitting. Only formatted lines split on newline.
        const target = blocks.find(b => b.id === blockId);
        if (target && target.type !== 'body' && text.includes('\n')) {
            const [first, ...rest] = text.split('\n');
            setBlocks(prev => {
                const idx = prev.findIndex(b => b.id === blockId);
                if (idx === -1) return prev;
                const current = prev[idx];
                const newBlock = makeBlock(current.type, rest.join('\n'));
                pendingFocusId.current = newBlock.id;
                const out = [...prev];
                out[idx] = { ...current, text: first };
                out.splice(idx + 1, 0, newBlock);
                return out;
            });
        } else {
            setBlocks(prev => prev.map(b => (b.id === blockId ? { ...b, text } : b)));
        }
        scheduleSave();
    };

    // track the cursor so Enter/formatting can split at the right spot
    const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

    // Enter on a FORMATTED line — continue the list, or exit to a body block.
    // (body blocks never call this: their Enter is a native newline)
    const splitBlock = (blockId: string) => {
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === blockId);
            if (idx === -1) return prev;
            const current = prev[idx];

            // enter on an empty list item exits the list back to body
            if (CONTINUING_TYPES.includes(current.type) && current.text.trim() === '') {
                const out = [...prev];
                out[idx] = { ...current, type: 'body', text: '' };
                return out;
            }

            const cut = Math.min(selectionRef.current.start, current.text.length);
            const before = current.text.slice(0, cut);
            const after = current.text.slice(cut);

            const nextType: NoteBlockType = CONTINUING_TYPES.includes(current.type) ? current.type : 'body';
            const newBlock = makeBlock(nextType, after);
            pendingFocusId.current = newBlock.id;
            const out = [...prev];
            out[idx] = { ...current, text: before };
            out.splice(idx + 1, 0, newBlock);
            return out;
        });
        scheduleSave();
    };

    // backspace at the start of an empty block removes it and focuses the previous one.
    // IMPORTANT: focus the previous input BEFORE the removal commits — if the focused
    // input unmounts first, the keyboard dismisses and reopens.
    const handleKeyPress = (blockId: string, key: string) => {
        if (key !== 'Backspace') return;

        const idx = blocks.findIndex(b => b.id === blockId);
        if (idx <= 0) return;
        const current = blocks[idx];
        if (current.text.length > 0) return;

        // formatted empty block → demote to body first, then delete on the next press
        if (current.type !== 'body') {
            setBlocks(prev => prev.map(b => (b.id === blockId ? { ...b, type: 'body' } : b)));
            scheduleSave();
            return;
        }

        // hand focus over while both inputs are still mounted — keyboard stays up
        inputRefs.current[blocks[idx - 1].id]?.focus();
        setBlocks(prev => mergeAdjacentBodies(prev.filter(b => b.id !== blockId)));
        scheduleSave();
    };

    const setBlockType = (type: NoteBlockType) => {
        if (!focusedBlockId) return;
        const current = blocks.find(b => b.id === focusedBlockId);
        if (!current) return;

        // formatting a line inside a multiline body block: split out just the
        // line the cursor is on; the rest stays as body text around it
        if (current.type === 'body' && type !== 'body' && current.text.includes('\n')) {
            const text = current.text;
            const pos = Math.min(selectionRef.current.start, text.length);
            const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
            let lineEnd = text.indexOf('\n', pos);
            if (lineEnd === -1) lineEnd = text.length;

            const before = text.slice(0, Math.max(0, lineStart - 1));
            const line = text.slice(lineStart, lineEnd);
            const after = text.slice(Math.min(text.length, lineEnd + 1));

            const formatted = makeBlock(type, line);
            pendingFocusId.current = formatted.id;

            setBlocks(prev => {
                const idx = prev.findIndex(b => b.id === current.id);
                if (idx === -1) return prev;
                const out = [...prev];
                const replacement: NoteBlock[] = [];
                if (lineStart > 0) replacement.push({ ...current, text: before });
                replacement.push(formatted);
                if (lineEnd < text.length) replacement.push(makeBlock('body', after));
                out.splice(idx, 1, ...replacement);
                return out;
            });
            scheduleSave();
            return;
        }

        setBlocks(prev => mergeAdjacentBodies(prev.map(b =>
            b.id === focusedBlockId
                ? { ...b, type, ...(type === 'check' && b.checked === undefined ? { checked: false } : {}) }
                : b
        )));
        scheduleSave();
    };

    const toggleCheck = (blockId: string) => {
        setBlocks(prev => prev.map(b => (b.id === blockId ? { ...b, checked: !b.checked } : b)));
        scheduleSave();
    };

    // focus the block queued by a split/merge once it exists — layout effect runs
    // before paint and keeps the keyboard up, so there's no flash between lines
    useLayoutEffect(() => {
        if (pendingFocusId.current) {
            const target = pendingFocusId.current;
            pendingFocusId.current = null;
            inputRefs.current[target]?.focus();
        }
    }, [blocks]);

    // ─── render ────────────────────────────────────────────────────────────────

    const focusedBlock = blocks.find(b => b.id === focusedBlockId);

    let numberCounter = 0;

    if (loading) {
        return (
            <AppLinearGradient variant="notes.background">
                <PageContainer>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.notes.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="notes.background">
            <PageContainer>
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
                >
                    {/* back button + copy-whole-note — no header title */}
                    <View style={styles.topRow}>
                        <Pressable onPress={handleBack} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Image source={SYSTEM_ICONS.sortLeft} style={{ width: 20, height: 20 }} />
                        </Pressable>

                        <Pressable
                            onPress={async () => {
                                const text = [title, ...blocks.map(b => b.text)]
                                    .filter(t => t.trim().length > 0)
                                    .join('\n');
                                if (!text) return;
                                await Clipboard.setStringAsync(text);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1500);
                            }}
                            hitSlop={10}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                            {copied && <Text style={styles.copiedLabel}>Copied!</Text>}
                            <Image source={SYSTEM_ICONS.duplicate} style={{ width: 18, height: 18, opacity: 0.7 }} />
                        </Pressable>
                    </View>

                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        onLayout={(e) => setEditorWidth(e.nativeEvent.layout.width)}
                    >
                        {/* date — like journal */}
                        <Text style={styles.date}>{formatDisplayDate(noteDate)}</Text>

                        {/* outlined note box — plain bordered card like the journal's
                            entry card. Explicit pixel width so the inputs inside wrap
                            (iOS won't bound a multiline TextInput to its parent). */}
                        <View style={[styles.noteBox, editorWidth > 0 && { width: editorWidth }]}>
                            <TextInput
                                style={styles.titleInput}
                                value={title}
                                onChangeText={(t) => { setTitle(t); scheduleSave(); }}
                                placeholder="Title"
                                placeholderTextColor="rgba(0,0,0,0.3)"
                                cursorColor={PAGE.notes.primary[0]}
                                selectionColor={PAGE.notes.primary[0]}
                                returnKeyType="next"
                                submitBehavior="submit"
                                onSubmitEditing={() => {
                                    const first = blocks[0];
                                    if (first) inputRefs.current[first.id]?.focus();
                                }}
                            />

                            {blocks.map(block => {
                                if (block.type === 'number') numberCounter += 1;
                                else numberCounter = 0;

                                const sharedProps = {
                                    value: block.text,
                                    onChangeText: (t: string) => updateBlockText(block.id, t),
                                    onKeyPress: (e: any) => handleKeyPress(block.id, e.nativeEvent.key),
                                    onFocus: () => {
                                        setFocusedBlockId(block.id);
                                        // reset the tracked cursor — a stale value from another
                                        // block would make formatting act on the wrong spot
                                        selectionRef.current = { start: block.text.length, end: block.text.length };
                                    },
                                    onSelectionChange: (e: any) => { selectionRef.current = e.nativeEvent.selection; },
                                    placeholderTextColor: 'rgba(0,0,0,0.3)',
                                    cursorColor: PAGE.notes.primary[0],
                                    selectionColor: PAGE.notes.primary[0],
                                    multiline: true,
                                    // native auto-grow handles height — no JS height
                                    // state (that caused the runaway growth loop)
                                    scrollEnabled: false,
                                    textAlignVertical: 'top' as const,
                                };

                                // body block — the journal's input, verbatim
                                if (block.type === 'body') {
                                    return (
                                        <TextInput
                                            key={block.id}
                                            ref={(r) => { inputRefs.current[block.id] = r; }}
                                            style={[globalStyles.body, styles.bodyArea]}
                                            placeholder={blocks.length === 1 && !block.text ? 'Start typing...' : undefined}
                                            {...sharedProps}
                                        />
                                    );
                                }

                                // formatted line — leading decoration + input.
                                // explicit width (box − padding − lead column − quote inset)
                                // so the input wraps on iOS like the body does.
                                const hasLead = block.type === 'bullet' || block.type === 'number' || block.type === 'check';
                                const fmtWidth = editorWidth > 0
                                    ? editorWidth - 20 - (hasLead ? 30 : 0) - (block.type === 'quote' ? 13 : 0)
                                    : undefined;

                                return (
                                    <View
                                        key={block.id}
                                        style={[styles.blockRow, block.type === 'quote' && styles.quoteBlock]}
                                    >
                                        {block.type === 'bullet' && (
                                            <View style={styles.lead}><Text style={styles.bulletDot}>•</Text></View>
                                        )}
                                        {block.type === 'number' && (
                                            <View style={styles.lead}><Text style={styles.numberLabel}>{numberCounter}.</Text></View>
                                        )}
                                        {block.type === 'check' && (
                                            <Pressable onPress={() => toggleCheck(block.id)} hitSlop={6} style={styles.lead}>
                                                <View style={[styles.checkbox, block.checked && styles.checkboxChecked]}>
                                                    {block.checked && <Text style={styles.checkmark}>✓</Text>}
                                                </View>
                                            </Pressable>
                                        )}

                                        <TextInput
                                            ref={(r) => { inputRefs.current[block.id] = r; }}
                                            style={[
                                                styles.blockInput,
                                                BLOCK_TEXT_STYLE[block.type],
                                                fmtWidth ? { width: fmtWidth } : null,
                                                block.type === 'check' && block.checked && styles.checkedText,
                                            ]}
                                            returnKeyType="next"
                                            submitBehavior="submit"
                                            onSubmitEditing={() => splitBlock(block.id)}
                                            {...sharedProps}
                                        />
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* formatting toolbar — acts on the focused block */}
                    <View style={styles.toolbar}>
                        {FORMAT_OPTIONS.map(opt => {
                            const isActive = focusedBlock?.type === opt.type;
                            return (
                                <Pressable
                                    key={opt.type}
                                    onPress={() => setBlockType(opt.type)}
                                    style={[styles.toolbarButton, isActive && styles.toolbarButtonActive]}
                                >
                                    <Text style={[styles.toolbarLabel, isActive && { color: '#fff' }]}>
                                        {opt.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </KeyboardAvoidingView>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    topRow: {
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    copiedLabel: {
        fontFamily: 'label',
        fontSize: 12,
        opacity: 0.6,
    },
    date: {
        fontFamily: 'p1',
        fontSize: 15,
        marginBottom: 12,
        paddingHorizontal: 3,
    },
    // same recipe as journalStyle.journalCard — plain bordered card
    noteBox: {
        borderWidth: 2,
        borderColor: PAGE.notes.primary[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 10,
        minHeight: 300,
    },
    // same recipe as the journal's entry input
    bodyArea: {
        width: '100%',
        paddingVertical: 6,
        paddingHorizontal: 10,
        fontSize: 15,
        lineHeight: 20,
    },
    titleInput: {
        fontFamily: 'p2',
        fontSize: 22,
        paddingVertical: 4,
        marginBottom: 6,
    },
    blockRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    quoteBlock: {
        borderLeftWidth: 3,
        borderLeftColor: PAGE.notes.primary[0],
        paddingLeft: 10,
        marginVertical: 2,
    },
    // fixed-width leading column shared by bullets / numbers / checkboxes
    lead: {
        width: 22,
        paddingTop: 6,
        alignItems: 'flex-start',
    },
    bulletDot: {
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '900',
    },
    numberLabel: {
        fontFamily: 'p3',
        fontSize: 15,
        lineHeight: 21,
    },
    checkbox: {
        width: 15,
        height: 15,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#000',
        marginTop: 3,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: PAGE.notes.primary[0],
        borderColor: PAGE.notes.primary[0],
    },
    checkmark: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    checkedText: {
        textDecorationLine: 'line-through',
        opacity: 0.5,
    },
    blockInput: {
        padding: 0,
        paddingVertical: 6,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    toolbarButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolbarButtonActive: {
        backgroundColor: PAGE.notes.primary[0],
    },
    toolbarLabel: {
        fontFamily: 'p2',
        fontSize: 14,
    },
});
