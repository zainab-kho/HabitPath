// @/app/(tabs)/more/notes/[id].tsx

import { PAGE } from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { globalStyles } from "@/styles";
import { AppLinearGradient } from "@/ui/AppLinearGradient";
import PageContainer from "@/ui/PageContainer";
import PageHeader from "@/ui/PageHeader";
import { formatDisplayDate, formatDisplayTime } from "@/utils/dateUtils";
import { APERCU_EDITOR_CSS } from "@/lib/editor/apercuEditorCss";
import { CoreBridge, RichText, TenTapStartKit, Toolbar, useEditorBridge } from "@10play/tentap-editor";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

export default function NoteEditorPage() {
    const { user } = useAuth();
    const { id, folderId } = useLocalSearchParams<{ id: string; folderId?: string }>();
    const isNew = id === 'new';

    const [title, setTitle] = useState('');
    const [noteDate] = useState<Date>(new Date());
    const [loading] = useState(false);

    // persistence is intentionally not wired yet (spike) — content lives in the
    // editor bridge only. When we wire saving, read HTML via editor.getHTML().
    const noteIdRef = useRef<string | null>(isNew ? null : id);

    // rich text editor (Tiptap in a WebView) — replaces the old native TextInput body
    const editor = useEditorBridge({
        autofocus: true,
        avoidIosKeyboard: true,
        initialContent: '<p></p>',
        // inject the app's Apercu font into the WebView so note text matches native text
        bridgeExtensions: [...TenTapStartKit, CoreBridge.configureCSS(APERCU_EDITOR_CSS)],
    });

    // exact date + time
    const [noteDateTime] = useState<Date>(() => new Date());
    const localDate = formatDisplayDate(noteDate);
    const localTime = formatDisplayTime(noteDateTime);

    // temporary debug: log serialized HTML so we can eyeball the format for the
    // future persistence step. Not wired to Supabase yet.
    const logHtml = useCallback(async () => {
        const html = await editor.getHTML();
        console.log('[note html]', noteIdRef.current, html);
    }, [editor]);

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
        <AppLinearGradient variant="notes.background">
            <PageContainer>
                <PageHeader title="" showBackButton />

                {/* date / time pill */}
                <View style={styles.datePill}>
                    <Text style={[globalStyles.body2, { fontSize: 13 }]}>
                        {localDate}  •  {localTime}
                    </Text>
                </View>

                <View style={styles.noteBox}>
                    {/* title */}
                    <TextInput
                        style={styles.titleInput}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Title"
                    />

                    {/* rich text body — WebView editor fills the rest of the box */}
                    <RichText editor={editor} onBlur={logHtml} style={styles.richText} />
                </View>
            </PageContainer>

            {/* toolbar — pinned to the bottom; tentap only reveals it while the
                editor is focused, and it rises above the keyboard. Must be
                absolutely positioned full-width or it collapses / hides off-screen. */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.toolbarContainer}
            >
                <Toolbar editor={editor} />
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
    noteBox: {
        flex: 1,
        borderWidth: 2,
        borderColor: PAGE.notes.primary[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 10,
        overflow: 'hidden',
    },
    titleInput: {
        fontFamily: 'p2',
        fontSize: 22,
        paddingVertical: 4,
        marginBottom: 6,
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
