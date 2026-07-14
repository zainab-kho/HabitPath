// @/app/(tabs)/more/notes/[id].tsx

import { PAGE } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { APERCU_EDITOR_CSS } from "@/lib/editor/apercuEditorCss";
import {
    editorHasContent,
    editorHtmlToStorage,
    noteToEditorHtml,
} from "@/lib/editor/noteContent";
import { createNote, loadNotes, updateNoteContent } from "@/lib/supabase/queries/notes";
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

    // load the existing note BEFORE mounting the editor, so its HTML can be the
    // editor's initialContent (the editor is created once, with that content).
    const [loading, setLoading] = useState(!isNew);
    const [initialHtml, setInitialHtml] = useState('<h1></h1>');
    const [initialNoteId, setInitialNoteId] = useState<string | null>(isNew ? null : id);
    const [initialUpdatedAt, setInitialUpdatedAt] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (isNew) { setLoading(false); return; }
        if (!user) return; // wait until auth is ready before loading
        (async () => {
            try {
                const notes = await loadNotes(user.id);
                const note = notes.find(n => n.id === id);
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
        autofocus: true,
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
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ignore the change events fired while the initial content hydrates the editor,
    // so simply opening a note doesn't bump its "last edited" time
    useEffect(() => {
        const t = setTimeout(() => { hydratedRef.current = true; }, 500);
        return () => clearTimeout(t);
    }, []);

    const persist = useCallback(async () => {
        if (!userId) return;
        const html = await editor.getHTML();
        if (!editorHasContent(html)) return; // don't create/keep an empty note
        const { title, blocks } = editorHtmlToStorage(html);
        try {
            if (!noteIdRef.current) {
                if (creatingRef.current) return;
                creatingRef.current = true;
                const created = await createNote(userId, { title, blocks, folderId });
                noteIdRef.current = created.id;
            } else {
                await updateNoteContent(noteIdRef.current, userId, title, blocks);
            }
            setEditedAt(new Date().toISOString());
        } catch (err) {
            console.error('Error saving note:', err);
        } finally {
            creatingRef.current = false;
        }
    }, [editor, userId, folderId]);

    const scheduleSave = useCallback(() => {
        if (!hydratedRef.current) return;
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
        if (wasFocusedRef.current && !isFocused) flush();
        wasFocusedRef.current = isFocused;
    }, [isFocused, flush]);

    const dismissKeyboard = useCallback(() => {
        editor.blur();
        Keyboard.dismiss();
    }, [editor]);

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
                        <RichText editor={editor} style={styles.richText} />
                    </View>

                    {/* empty space below the box (only while the keyboard is up) — tap to dismiss */}
                    {isKeyboardUp && <Pressable onPress={dismissKeyboard} style={styles.bottomDismiss} />}
                </View>
            </PageContainer>

            {/* toolbar — pinned to the bottom; shown only while editing (above the keyboard) */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.toolbarContainer}
            >
                <NoteToolbar editor={editor} />
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
    toolbarContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
    },
});
