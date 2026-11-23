// @/components/ui/TimeWheel.tsx
import { BUTTON_COLORS, COLORS } from '@/colors';
import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;
const WHEEL_HEIGHT = VISIBLE_ITEMS * ITEM_HEIGHT;

interface Props {
    data: string[];
    selected: string;
    // called when the wheel stops on a new value.
    // wraps is only sent when wrapAfter is set: how many times the wheel rolled past
    // that point (positive going forward, negative going back)
    onSelect: (value: string, wraps: number) => void;
    // the last value before the wheel "wraps around". hour wheels pass '11',
    // because going 11 -> 12 (or back) is when AM / PM should flip
    wrapAfter?: string;
    // endless scrolling. on by default for anything longer than AM / PM
    loop?: boolean;
}

// flips AM <-> PM. works as setMeridiem(toggleMeridiem) or toggleMeridiem(value)
export const toggleMeridiem = <T extends string>(m: T): T => (m === 'AM' ? 'PM' : 'AM') as T;

export function TimeWheel({ data, selected, onSelect, wrapAfter, loop = data.length > 2 }: Props) {
    const scrollRef = useRef<ScrollView>(null);

    // an endless wheel is really the same list repeated many times. the wheel always
    // rests in the middle copy and quietly jumps back there after every scroll,
    // so you can keep scrolling either way without ever reaching an end
    const n = data.length;
    const cycles = loop ? (Math.max(5, Math.ceil(240 / n)) | 1) : 1; // always odd, so there's a true middle copy
    const middle = Math.floor(cycles / 2) * n;
    const items = useMemo(
        () => (loop ? Array.from({ length: n * cycles }, (_, i) => data[i % n]) : data),
        [data, loop, n, cycles]
    );

    const indexOfValue = (value: string) => {
        const i = data.indexOf(value);
        return i < 0 ? -1 : middle + i;
    };

    // where the wheel is resting right now
    const currentIndex = useRef(Math.max(0, indexOfValue(selected)));
    const mounted = useRef(false);

    // ios often reports the same stop twice (once when the finger lifts, once when the snap
    // finishes). the second report can arrive after the wheel has jumped back to the middle,
    // which used to look like a full lap and flipped AM / PM by mistake. remembering the last
    // stop lets us ignore the repeat
    const lastSettled = useRef<number | null>(null);

    const scrollToIndex = (index: number, animated: boolean) => {
        currentIndex.current = index;
        scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated });
    };

    // keep the wheel on the selected value whenever it changes (first render, AM / PM flip, presets)
    useEffect(() => {
        const i = data.indexOf(selected);
        if (i < 0) return;

        if (!loop) {
            scrollToIndex(i, mounted.current);
        } else if (items[currentIndex.current] === selected) {
            // already showing it because the user just scrolled here. quietly jump back to the middle copy
            if (currentIndex.current !== middle + i) scrollToIndex(middle + i, false);
        } else if (!mounted.current) {
            scrollToIndex(middle + i, false);
        } else {
            // changed from outside (like a preset button). roll to the nearest copy instead of jumping
            const base = currentIndex.current - (currentIndex.current % n) + i;
            const nearest = [base - n, base, base + n].reduce((a, b) =>
                Math.abs(b - currentIndex.current) < Math.abs(a - currentIndex.current) ? b : a
            );
            scrollToIndex(nearest, true);
        }
        mounted.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected, data, loop]);

    // which lap of the wheel an index is on, counted from the wrap point (between 11 and 12 for hours)
    const wrapPosition = wrapAfter !== undefined ? data.indexOf(wrapAfter) : -1;
    const lap = (index: number) => Math.floor((index - wrapPosition - 1) / n);

    // saves whichever value the wheel came to rest on
    const settle = (offsetY: number) => {
        const index = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
        if (index === lastSettled.current) return; // the same stop reported twice, already handled
        lastSettled.current = index;
        const value = items[index];
        const wraps = loop && wrapPosition >= 0 ? lap(index) - lap(currentIndex.current) : 0;
        currentIndex.current = index;

        if (value === selected && loop) {
            // same value as before (or a full lap), so the effect above won't run. jump back to the middle here
            scrollToIndex(middle + data.indexOf(value), false);
        }
        if (value !== selected || wraps !== 0) {
            if (wrapAfter !== undefined) onSelect(value, wraps);
            else (onSelect as (value: string) => void)(value);
        }
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
                contentOffset={{ x: 0, y: currentIndex.current * ITEM_HEIGHT }}
                contentContainerStyle={{
                    paddingVertical: WHEEL_HEIGHT / 2 - ITEM_HEIGHT / 2,
                }}
                // a new drag is a new scroll, so its stop should always count
                onScrollBeginDrag={() => { lastSettled.current = null; }}
                onMomentumScrollEnd={e => settle(e.nativeEvent.contentOffset.y)}
                // a slow drag with no fling never fires onMomentumScrollEnd, so without this
                // the wheel would snap into place but the value would never be saved
                onScrollEndDrag={e => {
                    const { velocity, contentOffset } = e.nativeEvent;
                    if (!velocity || Math.abs(velocity.y) < 0.1) settle(contentOffset.y);
                }}
            >
                {items.map((value, i) => (
                    <View key={i} style={pickerStyles.item}>
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