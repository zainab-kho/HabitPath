// @/app/(tabs)/more/notes/[id].tsx

import { PAGE } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { APERCU_EDITOR_CSS } from "@/lib/editor/apercuEditorCss";
import {
    editorHasContent,
    editorHtmlToStorage,
    noteToEditorHtml,
} from "@/lib/editor/noteContent";
import { TASKLIST_BACKSPACE_FIX_JS } from "@/lib/editor/taskListBackspaceFix";
import { getCachedNote, upsertCachedNote } from "@/lib/notes/notesCache";
import { createNote, getNote, updateNoteContent } from "@/lib/supabase/queries/notes";
import { globalStyles } from "@/styles";
import { AppLinearGradient } from "@/ui/AppLinearGradient";
import { NoteToolbar } from "@/ui/NoteToolbar";
import PageContainer from "@/ui/PageContainer";
import PageHeader from "@/ui/PageHeader";
import { formatDisplayDate, formatDisplayTime } from "@/utils/dateUtils";
import { CoreBridge, RichText, TenTapStartKit, useBridgeState, useEditorBridge, useKeyboard } from "@10play/tentap-editor";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    LayoutAnimation,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

export default function NoteEditorPage() {
    const { user } = useAuth();
    const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();
    const isNew = id === 'new';

    // read from the shared cache synchronously so a tapped note opens instantly.
    // (The list keeps this fresh.) Only fetch when it's not cached, e.g. a deep link.
    const cached = isNew ? undefined : getCachedNote(id);

    const [loading, setLoading] = useState(!isNew && !cached);
    const [initialHtml, setInitialHtml] = useState(cached ? noteToEditorHtml(cached) : '<h1></h1>');
    const [initialNoteId, setInitialNoteId] = useState<string | null>(isNew ? null : (cached?.id ?? id));
    const [initialUpdatedAt, setInitialUpdatedAt] = useState<string | null>(cached?.updatedAt ?? null);

    useEffect(() => {
        let cancelled = false;
        if (isNew) { setLoading(false); return; }
        if (getCachedNote(id)) { setLoading(false); return; } // already have it from cache
        if (!user) return; // wait until auth is ready before loading
        (async () => {
            try {
                const note = await getNote(id, user.id);
                if (!cancelled && note) {
                    setInitialHtml(noteToEditorHtml(note));
                    setInitialNoteId(note.id);
                    setInitialUpdatedAt(note.updatedAt);
                }
            } catch (err) {
                console.error('Error loading note:', err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [id, isNew, user]);

    if (loading) {
        return (
            <AppLinearGradient variant="notes.background">
                <PageContainer>
                    <PageHeader title="" showBackButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.notes.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <NoteEditor
            userId={user?.id}
            initialHtml={initialHtml}
            initialNoteId={initialNoteId}
            initialUpdatedAt={initialUpdatedAt}
            folderId={(folderId as string) ?? null}
        />
    );
}

function NoteEditor({
    userId,
    initialHtml,
    initialNoteId,
    initialUpdatedAt,
    folderId,
}: {
    userId?: string;
    initialHtml: string;
    initialNoteId: string | null;
    initialUpdatedAt: string | null;
    folderId: string | null;
}) {
    // change handler kept in a ref so useEditorBridge always calls the latest one
    const onChangeRef = useRef<() => void>(() => {});

    const editor = useEditorBridge({
        // only new notes auto-focus (keyboard up to write); existing notes open
        // into a clean, unfocused page — tap the text to start editing
        autofocus: initialNoteId === null,
        initialContent: initialHtml,
        // inject the app's Apercu font into the WebView so note text matches native text
        bridgeExtensions: [...TenTapStartKit, CoreBridge.configureCSS(APERCU_EDITOR_CSS)],
        onChange: () => onChangeRef.current(),
    });

    // when the keyboard is down, let the text box expand; animate the change
    const { isKeyboardUp } = useKeyboard();
    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }, [isKeyboardUp]);

    // date pill shows when the note was last saved
    const [editedAt, setEditedAt] = useState(initialUpdatedAt ?? new Date().toISOString());

    const noteIdRef = useRef<string | null>(initialNoteId); // null until a new note is created
    const creatingRef = useRef(false);                       // guards double-create before the id lands
    const hydratedRef = useRef(false);                       // ignore change events from loading content
    const everFocusedRef = useRef(false);                    // no user focus yet → nothing to save
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ignore the change events fired while the initial content hydrates the editor,
    // so simply opening a note doesn't bump its "last edited" time
    useEffect(() => {
        const t = setTimeout(() => { hydratedRef.current = true; }, 500);
        return () => clearTimeout(t);
    }, []);

    // last content we saved (or the content as loaded) — persisting is skipped when
    // nothing actually changed, so focusing a note without editing doesn't bump time
    const savedHtmlRef = useRef<string | null>(null);

    const persist = useCallback(async () => {
        if (!userId) return;
        const html = await editor.getHTML();
        if (!editorHasContent(html)) return; // don't create/keep an empty note
        if (savedHtmlRef.current !== null && html === savedHtmlRef.current) return; // no change
        const { title, blocks } = editorHtmlToStorage(html);
        const now = new Date().toISOString();
        try {
            if (!noteIdRef.current) {
                if (creatingRef.current) return;
                creatingRef.current = true;
                const created = await createNote(userId, { title, blocks, folderId });
                noteIdRef.current = created.id;
                upsertCachedNote(created); // so reopening is instant + correct
            } else {
                await updateNoteContent(noteIdRef.current, userId, title, blocks);
                const existing = getCachedNote(noteIdRef.current);
                if (existing) upsertCachedNote({ ...existing, title, blocks, updatedAt: now });
            }
            savedHtmlRef.current = html;
            setEditedAt(now);
        } catch (err) {
            console.error('Error saving note:', err);
        } finally {
            creatingRef.current = false;
        }
    }, [editor, userId, folderId]);

    const scheduleSave = useCallback(() => {
        if (!hydratedRef.current) return;
        // slow WebView loads can fire hydration change events after the timer above —
        // until the user has actually tapped into the note there's nothing to save,
        // so opening a note to read it never bumps its "last edited" time
        if (!everFocusedRef.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(persist, 600);
    }, [persist]);

    // keep the editor's onChange pointing at the latest scheduleSave
    useEffect(() => { onChangeRef.current = scheduleSave; }, [scheduleSave]);

    // save immediately when the editor loses focus (covers leaving the screen)
    const flush = useCallback(() => {
        if (!hydratedRef.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        persist();
    }, [persist]);

    // flush on the focused → unfocused transition (reliable; the WebView's onBlur is not)
    const { isFocused } = useBridgeState(editor);
    const wasFocusedRef = useRef(false);
    useEffect(() => {
        if (isFocused) everFocusedRef.current = true;
        if (wasFocusedRef.current && !isFocused) flush();
        wasFocusedRef.current = isFocused;
    }, [isFocused, flush]);

    const dismissKeyboard = useCallback(() => {
        editor.blur();
        Keyboard.dismiss();
    }, [editor]);

    // keep the editor hidden behind a spinner until the WebView has rendered, so
    // you never see a half-painted note flash in. A short buffer after the page
    // loads lets the content paint; a fallback guarantees we never stay stuck.
    const [ready, setReady] = useState(false);
    const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const markReady = useCallback(() => {
        // add the checkbox-backspace fix AFTER load via the ref — passing
        // injectedJavaScript as a prop would override TenTap's own bootstrap
        // script and break all the editor styling
        editor.webviewRef?.current?.injectJavaScript?.(TASKLIST_BACKSPACE_FIX_JS);
        if (revealTimer.current) return;
        revealTimer.current = setTimeout(() => setReady(true), 250);
    }, [editor]);
    useEffect(() => {
        const fallback = setTimeout(() => setReady(true), 2500);
        return () => {
            clearTimeout(fallback);
            if (revealTimer.current) clearTimeout(revealTimer.current);
        };
    }, []);

    // once rendered, snapshot the loaded content as the "already saved" baseline
    useEffect(() => {
        if (!ready) return;
        editor.getHTML().then(h => { if (savedHtmlRef.current === null) savedHtmlRef.current = h; }).catch(() => {});
    }, [ready, editor]);

    const localDate = formatDisplayDate(new Date(editedAt));
    const localTime = formatDisplayTime(new Date(editedAt));

    return (
        <AppLinearGradient variant="notes.background">
            <PageContainer>
                <PageHeader title="" showBackButton />

                <View style={styles.body}>
                    {/* date / time pill — last edited; tap to dismiss the keyboard */}
                    <Pressable onPress={dismissKeyboard} style={styles.topDismiss}>
                        <View style={styles.datePill}>
                            <Text style={[globalStyles.body2, { fontSize: 13 }]}>
                                {localDate}  •  {localTime}
                            </Text>
                        </View>
                    </Pressable>

                    {/* rich text body — a plain View so taps only reach the WebView.
                        Fixed height while the keyboard is up; taller when it's down. */}
                    <View style={[styles.noteBox, isKeyboardUp ? styles.noteBoxFixed : styles.noteBoxFull]}>
                        <RichText editor={editor} onLoadEnd={markReady} style={styles.richText} />
                    </View>

                    {/* empty space below the box (only while the keyboard is up) — tap to dismiss */}
                    {ready && isKeyboardUp && <Pressable onPress={dismissKeyboard} style={styles.bottomDismiss} />}

                    {/* while the editor renders in the background, cover the whole area
                        (pill + box) with just a spinner, then reveal the finished page at once */}
                    {!ready && (
                        <AppLinearGradient variant="notes.background" style={styles.loadingCover}>
                            <ActivityIndicator size="small" color={PAGE.notes.primary[0]} />
                        </AppLinearGradient>
                    )}
                </View>
            </PageContainer>

            {/* toolbar — pinned above the keyboard. The KeyboardAvoidingView must be
                mounted from the START: it only learns the keyboard height from
                keyboard-show events, and a new note's autofocus pops the keyboard
                before `ready` — mounting late made the toolbar sit at the page
                bottom. Only the toolbar itself waits for `ready`. */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.toolbarContainer}
                pointerEvents="box-none"
            >
                {ready && <NoteToolbar editor={editor} />}
            </KeyboardAvoidingView>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    datePill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#000',
        backgroundColor: PAGE.notes.primary[1],
        alignSelf: 'center',
        marginBottom: 10,
    },
    body: {
        flex: 1,
    },
    topDismiss: {
        // wraps the date pill; tapping it dismisses without overlapping the editor
        alignItems: 'center',
    },
    bottomDismiss: {
        // fills the space under the box; tapping it dismisses the keyboard
        flex: 1,
    },
    noteBox: {
        borderWidth: 2,
        borderColor: PAGE.notes.primary[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 10,
        overflow: 'hidden',
    },
    noteBoxFixed: {
        // keyboard up: shorter so the box sits above the keyboard
        height: 300,
    },
    noteBoxFull: {
        // keyboard down: taller
        height: 600,
    },
    richText: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // covers the pill + box with just a spinner (matching the page gradient) while
    // the editor renders in the background; removed to reveal the finished page
    loadingCover: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    toolbarContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
    },
});
