// @/app/(tabs)/more/journal/index
import { COLORS, MOOD_COLORS, PAGE } from '@/components/colors';
import { SYSTEM_ICONS } from '@/components/icons';
import MoodPreview from '@/components/journal/MoodPreview';
import { JournalEntry } from '@/components/types/JournalEntry';
import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import EmptyStateView from '@/components/ui/EmptyStateView';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function JournalPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [entriesByMonth, setEntriesByMonth] = useState<Record<string, JournalEntry[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    const loadEntries = async () => {
        try {
            setIsLoading(true);

            // load from AsyncStorage first (instant display from cache)
            const cached = await AsyncStorage.getItem('@journal_entries');
            const cachedEntries: JournalEntry[] = cached ? JSON.parse(cached) : [];
            
            if (cachedEntries.length > 0) {
                groupAndSetEntries(cachedEntries);
            }

            // add delay to allow Supabase updates to propagate (1s)
            await new Promise(resolve => setTimeout(resolve, 1000));

            // load from Supabase (get fresh data from cloud)
            if (user) {
                const { data, error } = await supabase
                    .from('journal_entries')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('date', { ascending: false });

                if (error) {
                    console.error('Error loading from Supabase:', error);
                    // keep showing cached data on error
                    return;
                }

                if (data && data.length > 0) {                    
                    // convert Supabase data to JournalEntry format
                    const freshEntries: JournalEntry[] = data.map(row => ({
                        id: row.id,
                        date: new Date(row.date),
                        time: row.time,
                        mood: row.mood as keyof typeof MOOD_COLORS | undefined,
                        location: row.location || undefined,
                        entry: row.entry || undefined,
                    }));

                    // update cache with fresh data
                    await AsyncStorage.setItem('@journal_entries', JSON.stringify(freshEntries));

                    // display fresh data
                    groupAndSetEntries(freshEntries);
                }
            } else {
                console.log('Error: not logged in - showing only cached entries');
            }

        } catch (error) {
        } finally {
            setIsLoading(false);
        }
    };

    // helper function to group entries by month
    const groupAndSetEntries = (entries: JournalEntry[]) => {
        // sort most recent first
        entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

    return (
        <AppLinearGradient variant="journal.background">
            <PageContainer>
                <PageHeader
                    title="Journal"
                    showBackButton
                    showPlusButton
                    plusNavigateTo='/more/journal/NewEntry'
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
                                            onPress={() => router.push(`/more/journal/EntryDetail?id=${entry.id}` as any)}
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

                        {/* loading state */}
                        {isLoading && allEntries.length === 0 && (
                            <View style={styles.emptyState}>
                                <Image
                                    source={SYSTEM_ICONS.loading}
                                    style={{ width: 40, height: 40, marginBottom: 10, tintColor: COLORS.Primary }}
                                />
                            </View>
                        )}

                        {/* empty state */}
                        {!isLoading && allEntries.length === 0 && (
                            <EmptyStateView
                                icon={SYSTEM_ICONS.journal}
                                title="No journal entries yet"
                                description="How was your day today?"
                                buttonText="New Entry"
                                buttonAction={() => {
                                    router.push('/more/journal/NewEntry');
                                }}
                                buttonColor={PAGE.journal.buttonColor[0]}
                            />
                        )}
                    </View>
                </ScrollView>
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
        paddingTop: 60,
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