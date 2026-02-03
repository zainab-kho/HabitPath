// @/app/(tabs)/more/journal/index
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import MoodPreview from '@/components/journal/MoodPreview';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { JournalEntry } from '@/types/JournalEntry';

import { COLORS, MOOD_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { parseLocalDate } from '@/utils/dateUtils';

export default function JournalPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [entriesByMonth, setEntriesByMonth] = useState<Record<string, JournalEntry[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const loadEntries = async () => {
        if (!user) {
            setEntriesByMonth({});
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);

            // load cache immediately
            const cached = await AsyncStorage.getItem('@journal_entries');
            if (cached) {
                const cachedEntries: JournalEntry[] = JSON.parse(cached);
                if (cachedEntries.length > 0) {
                    const parsed = cachedEntries.map(e => ({
                        ...e,
                        date: parseLocalDate(e.date as any),
                    }));
                    groupAndSetEntries(parsed);
                }
            }

            // fetch fresh data
            const { data, error } = await supabase
                .from('journal_entries')
                .select('*')
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                return;
            }

            if (data && data.length > 0) {
                const fresh: JournalEntry[] = data.map(row => ({
                    id: row.id,
                    date: parseLocalDate(row.date),
                    time: row.time,
                    mood: row.mood,
                    location: row.location ?? undefined,
                    entry: row.entry ?? undefined,
                }));

                await AsyncStorage.setItem('@journal_entries', JSON.stringify(fresh));
                groupAndSetEntries(fresh);
            }

        } catch (err) {
            console.error('loadEntries failed:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // helper function to group entries by month
    const groupAndSetEntries = (entries: JournalEntry[]) => {
        // convert time string to minutes for sorting (e.g., "2:15 PM" -> 14*60 + 15 = 855)
        const timeToMinutes = (timeStr: string | undefined): number => {
            if (!timeStr) {
                console.log('Error: No time string provided');
                return 0;
            }

            try {
                // trim and normalize the string
                const normalized = timeStr.trim();

                // split by any whitespace character (handles regular space, NBSP, NNBSP, etc.)
                // toLocaleTimeString() uses Unicode char 8239
                const parts = normalized.split(/\s/);

                if (parts.length !== 2) {
                    console.log('Error: Invalid format (expected "HH:MM AM/PM"):', normalized, 'parts:', parts);
                    return 0;
                }

                const [time, period] = parts;
                const timeParts = time.split(':');

                if (timeParts.length !== 2) {
                    console.log('Error: Invalid time format:', time);
                    return 0;
                }

                const hours = parseInt(timeParts[0], 10);
                const minutes = parseInt(timeParts[1], 10);

                if (isNaN(hours) || isNaN(minutes)) {
                    console.log('Error: Could not parse hours/minutes:', hours, minutes);
                    return 0;
                }

                let hour24 = hours;
                if (period === 'PM' && hours !== 12) hour24 += 12;
                if (period === 'AM' && hours === 12) hour24 = 0;

                const result = hour24 * 60 + minutes;
                return result;
            } catch (error) {
                console.log('Error: Error parsing time:', timeStr, error);
                return 0;
            }
        };

        // sort by date (newest first), then by time (newest first)
        entries.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();

            // sort by date
            if (dateB !== dateA) {
                return dateB - dateA;
            }

            // if same date, sort by time (newest first)
            const timeA = timeToMinutes(a.time);
            const timeB = timeToMinutes(b.time);

            return timeB - timeA;
        });

        // group by month
        const grouped: Record<string, JournalEntry[]> = {};
        entries.forEach(entry => {
            const date = new Date(entry.date);
            const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(entry);
        });

        setEntriesByMonth(grouped);
    };

    // reload entries when page comes into focus
    useFocusEffect(
        useCallback(() => {
            loadEntries();
        }, [user])
    );

    const allEntries = Object.values(entriesByMonth).flat();
    console.log('All journal entries:', allEntries);

    return (
        <AppLinearGradient variant="journal.background">
            <PageContainer>
                <PageHeader
                    title="Journal"
                    // plusNavigateTo='/more/journal/NewEntry'
                    showBackButton
                />

                <ScrollView
                    contentContainerStyle={{
                        paddingHorizontal: 3,
                    }}
                    style={{ flex: 1 }}
                >
                    <View style={{ overflow: 'visible' }}>
                        {/* mood preview - shows last 3 months, taps to full year */}
                        {allEntries.length > 0 && (
                            <MoodPreview entries={allEntries} />
                        )}

                        {/* monthly entries list */}
                        {Object.entries(entriesByMonth).map(([month, entries]) => (
                            <View key={month} style={{ marginBottom: 25 }}>
                                <Text style={styles.monthHeader}>{month}</Text>

                                {entries.map(entry => {
                                    const date = new Date(entry.date);
                                    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                                    const bgColor = entry.mood ? MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] : '#fff';

                                    // check if entry is longer than 6 lines (rough estimate: ~50 chars per line)
                                    const isLong = entry.entry && entry.entry.length > 300;

                                    return (
                                        <Pressable
                                            key={entry.id}
                                            style={[styles.entryCard, { backgroundColor: bgColor }]}
                                            onPress={() => router.push(`/journal/EntryDetail?id=${entry.id}` as any)}
                                        >
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <Text style={styles.entryDate}>{formattedDate}</Text>
                                                {entry.time && <Text style={styles.entryTime}>{entry.time}</Text>}
                                            </View>

                                            {entry.location && (
                                                <View style={{ flexDirection: 'row' }}>
                                                    <Image
                                                        source={SYSTEM_ICONS.location}
                                                        style={{ width: 15, height: 15, tintColor: COLORS.Secondary, marginRight: 5, }}
                                                    />
                                                    <Text style={{
                                                        fontFamily: 'label',
                                                        fontSize: 14,
                                                        fontStyle: 'italic',
                                                        marginBottom: 10,
                                                    }}
                                                    >{entry.location}</Text>
                                                </View>
                                            )}

                                            {entry.entry && (
                                                <Text style={styles.entryText} numberOfLines={6}>
                                                    {entry.entry}
                                                </Text>
                                            )}

                                            {/* show "Read more" if text is truncated */}
                                            {isLong && (
                                                <Text style={styles.readMore}>Read more →</Text>
                                            )}
                                        </Pressable>
                                    );
                                })}
                            </View>
                        ))}

                        {/* empty state */}
                        {!isLoading && allEntries.length === 0 && (
                            <View style={styles.emptyState}>
                                <EmptyStateView
                                    icon={SYSTEM_ICONS.journal}
                                    title="No journal entries yet"
                                    description="How was your day today?"
                                    buttonText="New Entry"
                                    buttonAction={() => {
                                        router.push('/more/journal/NewEntry');
                                    }}
                                    buttonColor={PAGE.journal.primary[0]}
                                />
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* floating buttons */}
                <View style={{ position: 'absolute', top: 0, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={() => router.push('/more/journal/NewEntry')}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.journal.border[0]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                                shadowOffset={{x: 1, y: 1}}
                                >
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={SYSTEM_ICONS.write} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    monthHeader: {
        fontFamily: 'p2',
        fontSize: 19,
        marginBottom: 10,
    },
    entryCard: {
        padding: 20,
        borderRadius: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowOffset: { width: 3, height: 3 },
        shadowRadius: 0,
        borderColor: '#000',
        borderWidth: 1,
        overflow: 'visible'
    },
    entryDate: {
        fontFamily: 'p1',
        fontSize: 15,
        marginBottom: 4,
    },
    entryTime: {
        fontFamily: 'p2',
        fontSize: 15,
        marginBottom: 4,
    },
    entryLocation: {
        fontFamily: 'label',
        fontSize: 13,
        marginBottom: 6,
        fontStyle: 'italic',
    },
    entryText: {
        fontFamily: 'p3',
        fontSize: 15,
        lineHeight: 20,
    },
    readMore: {
        marginTop: 8,
        fontSize: 12,
        fontFamily: 'p2',
        color: COLORS.ReadMore,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
    },
    emptyText: {
        fontFamily: 'p2',
        fontSize: 18,
        marginBottom: 8,
    },
    emptySubtext: {
        fontFamily: 'label',
        fontSize: 14,
        color: '#666',
    },
});