// @/components/ui/SimpleCalendar.tsx
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { formatLocalDate } from '@/utils/dateUtils';
import React, { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface SimpleCalendarProps {
    selectedDate?: Date;
    onSelectDate: (date: Date) => void;
    selectedDateColor: string;
    minDate?: Date;
}

export default function SimpleCalendar({ selectedDate, onSelectDate, selectedDateColor, minDate }: SimpleCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate ?? new Date()));

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

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
        onSelectDate(newDate);
    };

    const isSelectedDate = (day: number) => {
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return selectedDate ? formatLocalDate(date) === formatLocalDate(selectedDate) : false;
    };

    const isDisabledDate = (day: number) => {
        if (!minDate) return false;
        const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        return formatLocalDate(date) < formatLocalDate(minDate);
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

            {/* weekday headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
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
                    const disabled = isDisabledDate(day);
                    return (
                        <Pressable
                            key={day}
                            style={{ width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' }}
                            onPress={() => selectDate(day)}
                            disabled={disabled}
                        >
                            <View
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 16,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    backgroundColor: selected ? selectedDateColor : 'transparent',
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