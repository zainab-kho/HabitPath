// @/app/(tabs)/more/notes/[id].tsx
// note editor — used for both new notes (id === 'new') and existing ones.
// no page title, just a back button + date.
//
// clean-slate version: a plain title + body text area. rich block formatting
// was removed — the toolbar at the bottom is kept as visual stubs for now.
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { NoteBlock } from '@/types/Note';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { formatDisplayDate } from '@/utils/dateUtils';

// the whole note body lives in one plain text string. on save it's wrapped in a
// single body block so it stays compatible with the notes list + search, which
// read `note.blocks`.
const blocksToText = (blocks: NoteBlock[]): string =>
    blocks.map(b => b.text).filter(Boolean).join('\n');

const textToBlocks = (text: string): NoteBlock[] =>
    text.trim().length ? [{ id: 'body', type: 'body', text }] : [];

// formatting toolbar labels — stubs for now, they don't do anything yet.
const FORMAT_OPTIONS = ['H1', 'H2', 'H3', 'Aa', '•', '1.', '☑', '❝'];

export default function NoteEditorPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();
    const isNew = id === 'new';

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [noteDate, setNoteDate] = useState<Date>(new Date());
    const [loading, setLoading] = useState(!isNew);
    const [copied, setCopied] = useState(false);

    // body input focus handling — mirrors the journal entry text area
    const inputRef = useRef<TextInput>(null);
    const [entryFocused, setEntryFocused] = useState(false);

    const noteIdRef = useRef<string | null>(isNew ? null : id);

    // ─── load existing note ────────────────────────────────────────────────────
    useEffect(() => {
        if (isNew || !user) return;
        (async () => {
            try {
                const all = await loadNotes(user.id);
                const note = all.find(n => n.id === id);
                if (note) {
                    setTitle(note.title);
                    setBody(blocksToText(note.blocks));
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
    const latest = useRef({ title, body });
    latest.current = { title, body };
    // guards against double-create when two saves race before the id lands
    const creatingRef = useRef(false);

    const persist = useCallback(async () => {
        if (!user) return;
        const { title: t, body: b } = latest.current;
        const blocks = textToBlocks(b);
        const hasContent = t.trim().length > 0 || blocks.length > 0;

        try {
            if (!noteIdRef.current) {
                if (!hasContent || creatingRef.current) return; // don't create empty notes
                creatingRef.current = true;
                const created = await createNote(user.id, {
                    title: t,
                    blocks,
                    folderId: (folderId as string) ?? null,
                });
                noteIdRef.current = created.id;
            } else {
                await updateNoteContent(noteIdRef.current, user.id, t, blocks);
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

    const handleCopy = useCallback(async () => {
        const text = [title, body].filter(t => t.trim().length > 0).join('\n');
        if (!text) return;
        await Clipboard.setStringAsync(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    }, [title, body]);

    // ─── render ────────────────────────────────────────────────────────────────

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
                            onPress={handleCopy}
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
                    >
                        {/* date — like journal */}
                        <Text style={styles.date}>{formatDisplayDate(noteDate)}</Text>

                        {/* outlined note box — plain bordered card like the journal's entry card */}
                        <View style={styles.noteBox}>
                            <TextInput
                                style={styles.titleInput}
                                value={title}
                                onChangeText={(t) => { setTitle(t); scheduleSave(); }}
                                placeholder="Title"
                                placeholderTextColor="rgba(0,0,0,0.3)"
                                cursorColor={PAGE.notes.primary[0]}
                                selectionColor={PAGE.notes.primary[0]}
                            />

                            <View>
                                <TextInput
                                    ref={inputRef}
                                    style={[globalStyles.body, styles.bodyArea]}
                                    placeholder="Start typing..."
                                    multiline
                                    // grow with content instead of scrolling internally
                                    scrollEnabled={false}
                                    textAlignVertical="top"
                                    cursorColor={PAGE.notes.primary[0]}
                                    selectionColor={PAGE.notes.primary[0]}
                                    placeholderTextColor="rgba(0,0,0,0.5)"
                                    value={body}
                                    onChangeText={(t) => { setBody(t); scheduleSave(); }}
                                    onFocus={() => setEntryFocused(true)}
                                    onBlur={() => setEntryFocused(false)}
                                />
                                {/* while blurred, this invisible layer catches touches so
                                    drags scroll the page — only a real tap re-focuses */}
                                {!entryFocused && (
                                    <Pressable
                                        style={StyleSheet.absoluteFill}
                                        onPress={() => inputRef.current?.focus()}
                                    />
                                )}
                            </View>
                        </View>
                    </ScrollView>

                    {/* formatting toolbar — visual stubs, no behaviour yet */}
                    <View style={styles.toolbar}>
                        {FORMAT_OPTIONS.map(label => (
                            <Pressable key={label} style={styles.toolbarButton}>
                                <Text style={styles.toolbarLabel}>{label}</Text>
                            </Pressable>
                        ))}
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
    titleInput: {
        fontFamily: 'p2',
        fontSize: 22,
        paddingVertical: 4,
        marginBottom: 6,
    },
    // same recipe as the journal's textArea, but auto-growing:
    // no fixed height / internal scroll — minHeight + native multiline growth
    bodyArea: {
        minHeight: 200,
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontSize: 15,
        lineHeight: 20,
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
    toolbarLabel: {
        fontFamily: 'p2',
        fontSize: 14,
    },
});
