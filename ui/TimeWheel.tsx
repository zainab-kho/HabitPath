// @/components/ui/TimeWheel.tsx
import { BUTTON_COLORS, COLORS } from '@/constants/colors';
import React, { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const ITEM_HEIGHT = 36;

interface Props {
    data: string[];
    selected: string;
    onSelect: (value: string) => void;
}

export function TimeWheel({ data, selected, onSelect }: Props) {
    const scrollRef = useRef<ScrollView>(null);

    const VISIBLE_ITEMS = 3;
    const WHEEL_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT;

    // auto-scroll to selected value when component mounts or selected changes
    useEffect(() => {
        const index = data.indexOf(selected);
        if (index >= 0 && scrollRef.current) {
            scrollRef.current.scrollTo({
                y: index * ITEM_HEIGHT,
                animated: false, // instant scroll on mount
            });
        }
    }, [selected, data]);

    // commits whichever value the wheel came to rest on
    const settle = (offsetY: number) => {
        const index = Math.max(0, Math.min(data.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
        if (data[index] !== selected) onSelect(data[index]);
    };

    return (
        <View style={[pickerStyles.wheelContainer, { height: WHEEL_HEIGHT }]}>

            {/* center highlight */}
            <View
                pointerEvents="none"
                style={[
                    pickerStyles.centerHighlight,
                    { top: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2 },
                ]}
            />

            {/* scrollable numbers */}
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                snapToInterval={ITEM_HEIGHT}
                decelerationRate="fast"
                contentContainerStyle={{
                    paddingVertical: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2,
                }}
                onMomentumScrollEnd={e => settle(e.nativeEvent.contentOffset.y)}
                // a slow drag that doesn't fling never fires onMomentumScrollEnd,
                // so the wheel would snap into place without committing the value
                onScrollEndDrag={e => {
                    const { velocity, contentOffset } = e.nativeEvent;
                    if (!velocity || Math.abs(velocity.y) < 0.1) settle(contentOffset.y);
                }}
            >
                {data.map(value => (
                    <View key={value} style={pickerStyles.item}>
                        <Text
                            style={[
                                pickerStyles.itemText,
                                value === selected && pickerStyles.selectedText,
                            ]}
                        >
                            {value}
                        </Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

export const pickerStyles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.Time,
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 18,
        alignSelf: 'center',
        width: '100%',
        padding: 5,
    },

    wheelContainer: {
        width: 60,
        marginHorizontal: 5,
    },

    item: {
        height: ITEM_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },

    itemText: {
        fontFamily: 'p2',
        fontSize: 14,
        opacity: 0.35,
    },

    selectedText: {
        fontFamily: 'p1',
        fontSize: 14,
        opacity: 1,
    },

    centerHighlight: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: ITEM_HEIGHT,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderColor: BUTTON_COLORS.Save,
    },
});