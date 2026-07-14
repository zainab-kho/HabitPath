// @/ui/NoteToolbar.tsx
// Custom formatting toolbar for the notes editor. Replaces tentap's built-in
// icon <Toolbar> with the app's pill design (white, black border, rounded) and
// text labels in Apercu. Horizontally scrollable. Wired to the editor bridge
// commands; active state comes from useBridgeState. Mirrors tentap's default
// visibility: only shown while the editor is focused and the keyboard is up.

import { PAGE } from "@/constants/colors";
import {
    type BridgeState,
    type EditorBridge,
    useBridgeState,
    useKeyboard,
} from "@10play/tentap-editor";
import { Pressable, ScrollView, StyleSheet, Text, type TextStyle, View } from "react-native";

type ToolbarItem = {
    key: string;
    label: string;
    labelStyle?: TextStyle;
    isActive: (s: BridgeState) => boolean;
    onPress: (editor: EditorBridge, s: BridgeState) => void;
};

const ITEMS: ToolbarItem[] = [
    { key: 'bold', label: 'B', labelStyle: { fontFamily: 'p1' },
        isActive: s => s.isBoldActive, onPress: e => e.toggleBold() },
    { key: 'italic', label: 'I', labelStyle: { fontStyle: 'italic' },
        isActive: s => s.isItalicActive, onPress: e => e.toggleItalic() },
    { key: 'underline', label: 'U', labelStyle: { textDecorationLine: 'underline' },
        isActive: s => s.isUnderlineActive, onPress: e => e.toggleUnderline() },
    { key: 'h1', label: 'H1',
        isActive: s => s.headingLevel === 1, onPress: e => e.toggleHeading(1) },
    { key: 'h2', label: 'H2',
        isActive: s => s.headingLevel === 2, onPress: e => e.toggleHeading(2) },
    { key: 'h3', label: 'H3',
        isActive: s => s.headingLevel === 3, onPress: e => e.toggleHeading(3) },
    // Aa = back to body text: clears the active heading if there is one.
    { key: 'body', label: 'Aa',
        isActive: s => !s.headingLevel,
        onPress: (e, s) => { if (s.headingLevel) e.toggleHeading(s.headingLevel as 1 | 2 | 3 | 4 | 5 | 6); } },
    { key: 'bullet', label: '•',
        isActive: s => s.isBulletListActive, onPress: e => e.toggleBulletList() },
    { key: 'ordered', label: '1.',
        isActive: s => s.isOrderedListActive, onPress: e => e.toggleOrderedList() },
    { key: 'task', label: '☑',
        isActive: s => s.isTaskListActive, onPress: e => e.toggleTaskList() },
    { key: 'quote', label: '❝',
        isActive: s => s.isBlockquoteActive, onPress: e => e.toggleBlockquote() },
];

export function NoteToolbar({ editor, onDone }: { editor: EditorBridge; onDone?: () => void }) {
    const state = useBridgeState(editor);
    const { isKeyboardUp } = useKeyboard();

    // match tentap's default: hidden unless actively editing the rich text body
    if (!isKeyboardUp || !state.isFocused) return null;

    return (
        <View style={styles.row}>
            {/* the formatting pill: fixed width, buttons scroll horizontally inside */}
            <View style={styles.bar}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyboardShouldPersistTaps="always"
                    contentContainerStyle={styles.content}
                >
                    {ITEMS.map(item => {
                        const active = item.isActive(state);
                        return (
                            <Pressable
                                key={item.key}
                                style={[styles.button, active && styles.buttonActive]}
                                onPress={() => item.onPress(editor, state)}
                            >
                                <Text style={[styles.label, item.labelStyle, active && styles.labelActive]}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Done: closes the keyboard */}
            {onDone && (
                <Pressable onPress={onDone} style={styles.doneButton}>
                    <Text style={styles.doneLabel}>Done</Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 10,
        gap: 8,
    },
    bar: {
        // formatting pill takes the remaining width; Done sits to its right
        flex: 1,
        backgroundColor: PAGE.notes.primary[1],
        borderWidth: 2,
        borderColor: PAGE.notes.primary[0],
        borderRadius: 20,
        overflow: 'hidden', // clip the scrolling buttons to the rounded corners
    },
    doneButton: {
        height: 46,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: PAGE.notes.primary[0],
        backgroundColor: PAGE.notes.primary[1],
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneLabel: {
        fontFamily: 'p1',
        fontSize: 14,
        color: '#000',
    },
    content: {
        // the scrollable row that lives inside the pill
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    button: {
        minWidth: 40,
        height: 34,
        borderRadius: 10,
        paddingHorizontal: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonActive: {
        backgroundColor: '#000',
    },
    label: {
        fontFamily: 'p2',
        fontSize: 14,
        color: '#000',
    },
    labelActive: {
        color: '#fff',
    },
});
