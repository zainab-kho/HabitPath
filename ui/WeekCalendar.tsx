// @/components/ui/WeekCalendar.tsx
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

interface WeekCalendarProps {
    selectedWeekStart: Date;
    onSelectWeek: (weekStart: Date) => void;
    weekStartDay?: number;
    highlightColor?: string;
}

const getWeekStartForDay = (date: Date, weekStartDay: number) => {
    const day = date.getDay();
    const diff = ((day - weekStartDay) % 7 + 7) % 7;
    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);
    return start;
};

const getWeekStart = (date: Date) => getWeekStartForDay(date, 1);

const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

export default function WeekCalendar({
    selectedWeekStart,
    onSelectWeek,
    weekStartDay = 1,
    highlightColor,
}: WeekCalendarProps) {
    const effectiveGetWeekStart = (date: Date) => getWeekStartForDay(date, weekStartDay);
    const [currentMonth, setCurrentMonth] = useState(new Date(selectedWeekStart));

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // get today's date for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    /**
     * build a full 6-week grid (42 days), starting on the Monday
     * before the 1st of the month.
     */
    const calendarDays = useMemo(() => {
        const firstOfMonth = new Date(year, month, 1);
        const lastOfMonth = new Date(year, month + 1, 0);

        const start = effectiveGetWeekStart(firstOfMonth);
        const end = new Date(effectiveGetWeekStart(lastOfMonth));
        end.setDate(end.getDate() + 6);

        const days = [];
        let d = new Date(start);

        while (d <= end) {
            days.push(new Date(d));
            d.setDate(d.getDate() + 1);
        }

        return days;
    }, [year, month, weekStartDay]);

    const selectedWeekDays = useMemo(() => {
        return Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(selectedWeekStart);
            d.setDate(selectedWeekStart.getDate() + i);
            return d;
        });
    }, [selectedWeekStart]);

    const isInSelectedWeek = (date: Date) =>
        selectedWeekDays.some(d => isSameDay(d, date));

    const isWeekStart = (date: Date) =>
        isSameDay(date, selectedWeekDays[0]);

    const isWeekEnd = (date: Date) =>
        isSameDay(date, selectedWeekDays[6]);

    // check if a week is in the past (entire week has ended)
    const isWeekInPast = (date: Date) => {
        const weekStart = effectiveGetWeekStart(date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return weekEnd < today;
    };

    const monthName = currentMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    });

    return (
        <View style={{ padding: 10 }}>
            {/* header */}
            <View
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 15,
                }}
            >
                <Pressable onPress={() => setCurrentMonth(new Date(year, month - 1))}>
                    <Image source={SYSTEM_ICONS.sortLeft} style={{ width: 20, height: 20 }} />
                </Pressable>

                <Text style={globalStyles.body}>{monthName}</Text>

                <Pressable onPress={() => setCurrentMonth(new Date(year, month + 1))}>
                    <Image source={SYSTEM_ICONS.sortRight} style={{ width: 20, height: 20 }} />
                </Pressable>
            </View>

            {/* weekday headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {Array.from({ length: 7 }, (_, i) =>
                    ['S', 'M', 'T', 'W', 'T', 'F', 'S'][(weekStartDay + i) % 7]
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
                {calendarDays.map((date, i) => {
                    const selected = isInSelectedWeek(date);
                    const muted = date.getMonth() !== month;
                    const isPast = isWeekInPast(date);

                    return (
                        <Pressable
                            key={i}
                            style={{
                                width: '14.28%',
                                aspectRatio: 1,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                            onPress={() => onSelectWeek(effectiveGetWeekStart(date))}
                            disabled={isPast} // disable selecting past weeks
                        >
                            {/* week-wide background strip */}
                            {selected && (
                                <View
                                    style={{
                                        position: 'absolute',
                                        left: isWeekStart(date) ? '12%' : 0,
                                        right: isWeekEnd(date) ? '12%' : 0,
                                        top: 5,
                                        height: 30,
                                        backgroundColor: highlightColor ?? PAGE.assignments.primary[0],
                                        borderTopLeftRadius: isWeekStart(date) ? 16 : 0,
                                        borderBottomLeftRadius: isWeekStart(date) ? 16 : 0,
                                        borderTopRightRadius: isWeekEnd(date) ? 16 : 0,
                                        borderBottomRightRadius: isWeekEnd(date) ? 16 : 0,
                                    }}
                                />
                            )}

                            <Text
                                style={[
                                    globalStyles.body2,
                                    { fontSize: 13 },
                                    muted && { opacity: 0.4 },
                                    isPast && { opacity: 0.3 }, // dim past weeks
                                    selected && { fontWeight: 'bold' },
                                ]}
                            >
                                {date.getDate()}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}