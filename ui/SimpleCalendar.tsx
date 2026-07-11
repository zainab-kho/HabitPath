// @/components/ui/SimpleCalendar.tsx
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { formatLocalDate, getWeekDatesForDate, getWeekStartDow } from '@/utils/dateUtils';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface SimpleCalendarProps {
    selectedDate?: Date;
    onSelectDate: (date: Date) => void;
    selectedDateColor: string;
    minDate?: Date;
    weekSelectMode?: boolean;
}

export default function SimpleCalendar({ selectedDate, onSelectDate, selectedDateColor, minDate, weekSelectMode }: SimpleCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate ?? new Date()));

    // grid columns follow the user's configured week start day
    const weekStartDow = getWeekStartDow();

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() - weekStartDow + 7) % 7;

        return { daysInMonth, startingDayOfWeek };
    };

    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const selectDate = (day: number) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        if (minDate && formatLocalDate(newDate) < formatLocalDate(minDate)) return;
        if (weekSelectMode) {
            const weekDates = getWeekDatesForDate(formatLocalDate(newDate));
            const mondayParts = weekDates[0].split('-').map(Number);
            const monday = new Date(mondayParts[0], mondayParts[1] - 1, mondayParts[2], 12);
            onSelectDate(monday);
        } else {
            onSelectDate(newDate);
        }
    };

    const selectedWeekDatesArr = useMemo(() => {
        if (!weekSelectMode || !selectedDate) return [] as string[];
        return getWeekDatesForDate(formatLocalDate(selectedDate));
    }, [weekSelectMode, selectedDate]);

    const selectedWeekDates = useMemo(() => new Set(selectedWeekDatesArr), [selectedWeekDatesArr]);

    const isSelectedDate = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = formatLocalDate(date);
        if (weekSelectMode) {
            return selectedWeekDates.has(dateStr);
        }
        return selectedDate ? dateStr === formatLocalDate(selectedDate) : false;
    };

    const isSelectedMonday = (day: number) => {
        if (!weekSelectMode || !selectedDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return formatLocalDate(date) === formatLocalDate(selectedDate);
    };

    const isWeekFirstDay = (day: number) => {
        if (!weekSelectMode || selectedWeekDatesArr.length === 0) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return formatLocalDate(date) === selectedWeekDatesArr[0];
    };

    const isWeekLastDay = (day: number) => {
        if (!weekSelectMode || selectedWeekDatesArr.length === 0) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return formatLocalDate(date) === selectedWeekDatesArr[selectedWeekDatesArr.length - 1];
    };

    const isDisabledDate = (day: number) => {
        if (!minDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return formatLocalDate(date) < formatLocalDate(minDate);
    };

    const todayStr = formatLocalDate(new Date());

    const isTodayDate = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return formatLocalDate(date) === todayStr;
    };

    const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
        <View style={{ padding: 10 }}>
            {/* month header */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 15,
            }}>
                <Pressable onPress={previousMonth} style={{ padding: 8 }}>
                    <Image
                        source={SYSTEM_ICONS.sortLeft}
                        style={{ width: 20, height: 20 }}
                    />
                </Pressable>
                <Text style={globalStyles.body}>{monthName}</Text>
                <Pressable onPress={nextMonth} style={{ padding: 8 }}>
                    <Image
                        source={SYSTEM_ICONS.sortRight}
                        style={{ width: 20, height: 20 }}
                    />
                </Pressable>
            </View>

            {/* weekday headers — rotated to the configured week start */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {Array.from({ length: 7 }, (_, i) =>
                    ['S', 'M', 'T', 'W', 'T', 'F', 'S'][(weekStartDow + i) % 7]
                ).map((day, i) => (
                    <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={[globalStyles.label, { fontSize: 11, opacity: 0.6 }]}>
                            {day}
                        </Text>
                    </View>
                ))}
            </View>

            {/* calendar grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {/* empty cells for days before month starts */}
                {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                    <View key={`empty-${i}`} style={{ width: '14.28%', aspectRatio: 1 }} />
                ))}

                {/* days of the month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const selected = isSelectedDate(day);
                    const monday = isSelectedMonday(day);
                    const disabled = isDisabledDate(day);
                    const today = isTodayDate(day);
                    const firstDay = isWeekFirstDay(day);
                    const lastDay = isWeekLastDay(day);
                    return (
                        <Pressable
                            key={day}
                            style={{
                                width: '14.28%',
                                aspectRatio: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            onPress={() => selectDate(day)}
                            disabled={disabled}
                        >
                            {weekSelectMode && selected && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        left: firstDay ? '12%' : 0,
                                        right: lastDay ? '12%' : 0,
                                        top: 5,
                                        height: 30,
                                        backgroundColor: selectedDateColor,
                                        borderTopLeftRadius: firstDay ? 16 : 0,
                                        borderBottomLeftRadius: firstDay ? 16 : 0,
                                        borderTopRightRadius: lastDay ? 16 : 0,
                                        borderBottomRightRadius: lastDay ? 16 : 0,
                                    }}
                                />
                            )}
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: !weekSelectMode && selected ? selectedDateColor : 'transparent',
                                    borderWidth: today && !selected ? 1.5 : 0,
                                    borderColor: today && !selected ? selectedDateColor : 'transparent',
                                }}
                            >
                                <Text
                                    style={[
                                        globalStyles.body2,
                                        { fontSize: 13 },
                                        selected && { fontWeight: 'bold' },
                                        disabled && { opacity: 0.25 },
                                    ]}
                                >
                                    {day}
                                </Text>
                            </View>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}