// @/app/(tabs)/more/journal/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
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

const JOURNAL_UNLOCK_KEY = '@journal_pin_unlocked';

export default function JournalPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, JournalEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const refreshUnlockState = useCallback(async () => {
    const raw = await AsyncStorage.getItem(JOURNAL_UNLOCK_KEY);
    setIsUnlocked(raw === '1');
  }, []);

  const timeToMinutes = (timeStr?: string): number => {
    if (!timeStr) return 0;

    try {
      // Handles odd unicode spaces from toLocaleTimeString()
      const parts = timeStr.trim().split(/\s+/);
      if (parts.length !== 2) return 0;

      const [time, period] = parts;
      const [hh, mm] = time.split(':');
      const hours = parseInt(hh, 10);
      const minutes = parseInt(mm, 10);
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;

      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;

      return hour24 * 60 + minutes;
    } catch {
      return 0;
    }
  };

  const groupAndSetEntries = useCallback((entries: JournalEntry[]) => {
    // newest date then newest time
    const sorted = [...entries].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();

      if (dateB !== dateA) return dateB - dateA;
      return timeToMinutes(b.time) - timeToMinutes(a.time);
    });

    const grouped: Record<string, JournalEntry[]> = {};
    for (const entry of sorted) {
      const date = new Date(entry.date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(entry);
    }

    setEntriesByMonth(grouped);
  }, []);

  const loadEntries = useCallback(async () => {
    if (!user) {
      setEntriesByMonth({});
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // 1) load cache immediately
      const cached = await AsyncStorage.getItem('@journal_entries');
      if (cached) {
        const cachedEntries: JournalEntry[] = JSON.parse(cached);
        if (cachedEntries?.length) {
          const parsed = cachedEntries.map(e => ({
            ...e,
            date: parseLocalDate(e.date as any),
          }));
          groupAndSetEntries(parsed);
        }
      }

      // 2) fetch fresh data
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      const fresh: JournalEntry[] = (data || []).map(row => ({
        id: row.id,
        date: parseLocalDate(row.date),
        time: row.time,
        mood: row.mood,
        location: row.location ?? undefined,
        entry: row.entry ?? undefined,
      }));

      await AsyncStorage.setItem('@journal_entries', JSON.stringify(fresh));
      groupAndSetEntries(fresh);
    } catch (err) {
      console.error('loadEntries failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, groupAndSetEntries]);

  // No locking the page — just refresh icon state + load entries
  useFocusEffect(
    useCallback(() => {
      refreshUnlockState();
      loadEntries();
    }, [refreshUnlockState, loadEntries])
  );

  const handleHeaderLockPress = useCallback(async () => {
    if (!isUnlocked) {
      router.push('/(tabs)/more/journal/EnterPin');
      return;
    }

    await AsyncStorage.removeItem(JOURNAL_UNLOCK_KEY);
    setIsUnlocked(false);
  }, [isUnlocked, router]);

  const allEntries = useMemo(() => Object.values(entriesByMonth).flat(), [entriesByMonth]);

  return (
    <AppLinearGradient variant="journal.background">
      <PageContainer>
        <PageHeader
          title="Journal"
          showPlusButton
          showBackButton
          plusNavigateTo="/more/journal/EnterPin"
          navigateIcon={isUnlocked ? SYSTEM_ICONS.padlock : SYSTEM_ICONS.lock}
          onNavigatePress={handleHeaderLockPress as any}
        />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 65 }}
          style={{ flex: 1 }}
        >
          <View style={{ overflow: 'visible' }}>
            {/* Mood preview */}
            {allEntries.length > 0 && <MoodPreview entries={allEntries} />}

            {/* Monthly entries list */}
            {Object.entries(entriesByMonth).map(([month, entries]) => (
              <View key={month} style={{ marginBottom: 25 }}>
                <Text style={styles.monthHeader}>{month}</Text>

                {entries.map(entry => {
                  const date = new Date(entry.date);
                  const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const bgColor = entry.mood
                    ? MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS]
                    : '#fff';

                  const isLong = !!entry.entry && entry.entry.length > 300;

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
                            style={{ width: 15, height: 15, tintColor: COLORS.Secondary, marginRight: 5 }}
                          />
                          <Text style={styles.entryLocation}>{entry.location}</Text>
                        </View>
                      )}

                      {entry.entry && (
                        <Text style={styles.entryText} numberOfLines={6}>
                          {entry.entry}
                        </Text>
                      )}

                      {isLong && <Text style={styles.readMore}>Read more →</Text>}
                    </Pressable>
                  );
                })}
              </View>
            ))}

            {/* Empty state */}
            {!isLoading && allEntries.length === 0 && (
              <View style={styles.emptyState}>
                <EmptyStateView
                  icon={SYSTEM_ICONS.journal}
                  title="No journal entries yet"
                  description="How was your day today?"
                  buttonText="New Entry"
                  buttonAction={() => router.push('/more/journal/NewEntry')}
                  buttonColor={PAGE.journal.primary[0]}
                />
              </View>
            )}
          </View>
        </ScrollView>

        {/* floating button */}
        <View style={{ position: 'absolute', bottom: 50, right: 0, zIndex: 5 }}>
          <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
            <Pressable onPress={() => router.push('/more/journal/NewEntry')}>
              <ShadowBox
                contentBackgroundColor={PAGE.journal.border[0]}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
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
    overflow: 'visible',
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
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 10,
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
});