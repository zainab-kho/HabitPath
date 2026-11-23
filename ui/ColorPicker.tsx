// @/ui/ColorPicker.tsx
// the row of color circles used on new reward, new course, new countdown and new path.
// tap a circle to pick it. the picked one fills in with a black outline
import React from 'react';
import { Pressable, View } from 'react-native';

import { PRESET_COLORS } from '@/colors';
import ShadowBox from '@/ui/ShadowBox';

// a color to show, and what gets saved when it's picked.
// usually they're the same hex code, but paths save the color's name instead
export interface ColorOption {
    value: string;
    hex: string;
}

// the preset colors, saved as their hex codes
export const PRESET_COLOR_OPTIONS: ColorOption[] = PRESET_COLORS.map(hex => ({ value: hex, hex }));

interface ColorPickerProps {
    // the saved value of the picked color
    selected: string;
    onSelect: (value: string) => void;
    // the box behind the circles, usually the page's light background color
    backgroundColor: string;
    options?: ColorOption[];
}

export default function ColorPicker({
    selected,
    onSelect,
    backgroundColor,
    options = PRESET_COLOR_OPTIONS,
}: ColorPickerProps) {
    return (
        <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            padding: 15,
            borderRadius: 15,
            backgroundColor,
        }}>
            {options.map(({ value, hex }) => {
                const isSelected = selected === value;
                return (
                    <ShadowBox
                        key={value}
                        contentBackgroundColor={isSelected ? hex : '#fff'}
                        contentBorderColor={isSelected ? '#000' : hex}
                        contentBorderWidth={1}
                        contentBorderRadius={18}
                        shadowBorderColor={isSelected ? '#000' : hex}
                        shadowColor={isSelected ? '#000' : hex}
                        shadowBorderRadius={18}
                    >
                        <Pressable onPress={() => onSelect(value)} style={{ width: 25, height: 25 }} />
                    </ShadowBox>
                );
            })}
        </View>
    );
}
