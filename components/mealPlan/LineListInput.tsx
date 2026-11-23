// @/components/mealPlan/LineListInput.tsx
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { PAGE } from '@/colors';
import { globalStyles } from '@/styles';

// one line of the list. the id stays the same while the text changes,
// so react keeps each input (and its keyboard focus) in place
export interface ListLine {
    id: string;
    text: string;
}

let nextLineId = 0;
export const makeLine = (text = ''): ListLine => ({ id: `line-${nextLineId++}`, text });

// turns saved strings into lines, always ending up with at least one line to type in
export const toLines = (items: string[]): ListLine[] =>
    items.length > 0 ? items.map(item => makeLine(item)) : [makeLine()];

// the typed lines as plain strings, with empty ones dropped
export const fromLines = (lines: ListLine[]): string[] =>
    lines.map(line => line.text.trim()).filter(Boolean);

interface LineListInputProps {
    lines: ListLine[];
    onChange: (lines: ListLine[]) => void;
    placeholder: string;
    // shows 1, 2, 3... in a bubble before each line (used for recipe steps)
    numbered?: boolean;
}

// a quick list to type into: press enter and the next line appears, ready to type.
// a line left empty removes itself when you tap away
export function LineListInput({ lines, onChange, placeholder, numbered = false }: LineListInputProps) {
    const inputs = useRef<Record<string, TextInput | null>>({});
    // the line to focus once it has been added to the screen
    const focusNext = useRef<string | null>(null);

    useEffect(() => {
        if (!focusNext.current) return;
        inputs.current[focusNext.current]?.focus();
        focusNext.current = null;
    }, [lines]);

    const updateText = (id: string, text: string) =>
        onChange(lines.map(line => (line.id === id ? { ...line, text } : line)));

    // enter adds a new line under this one. an empty line stays put, so enter can't stack up blanks
    const handleSubmit = (index: number) => {
        if (!lines[index].text.trim()) return;

        const newLine = makeLine();
        focusNext.current = newLine.id;
        onChange([...lines.slice(0, index + 1), newLine, ...lines.slice(index + 1)]);
    };

    // an empty line disappears when it loses focus, as long as it isn't the only one left
    const handleBlur = (id: string) => {
        const line = lines.find(l => l.id === id);
        if (!line || line.text.trim() || lines.length === 1) return;

        onChange(lines.filter(l => l.id !== id));
    };

    return (
        <View style={styles.box}>
            {lines.map((line, index) => (
                <View key={line.id} style={styles.row}>
                    {numbered && (
                        <View style={styles.numberBubble}>
                            <Text style={[globalStyles.label, { opacity: 1 }]}>{index + 1}</Text>
                        </View>
                    )}

                    <TextInput
                        ref={input => { inputs.current[line.id] = input; }}
                        style={[globalStyles.body, styles.input]}
                        placeholder={placeholder}
                        placeholderTextColor="rgba(0,0,0,0.4)"
                        value={line.text}
                        onChangeText={text => updateText(line.id, text)}
                        onSubmitEditing={() => handleSubmit(index)}
                        onBlur={() => handleBlur(line.id)}
                        // keeps the keyboard open when enter is pressed
                        submitBehavior="submit"
                        returnKeyType="next"
                        cursorColor={PAGE.mealPlan.primary[1]}
                        selectionColor={PAGE.mealPlan.primary[1]}
                    />
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: PAGE.mealPlan.background[1],
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: PAGE.mealPlan.primary[0],
    },
    numberBubble: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
});
