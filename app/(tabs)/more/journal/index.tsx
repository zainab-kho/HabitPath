// @/app/(tabs)/more/journal/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import MoodPreview from '@/components/journal/MoodPreview';
import SongCard from '@/components/journal/SongCard';
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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function JournalPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, JournalEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // inline search — expands from the search button, filters + highlights
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const query = searchQuery.trim().toLowerCase();

  const toggleSearch = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSearchOpen(prev => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);


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
        lock: row.is_locked ?? undefined,
        entry: row.entry ?? undefined,
        song: row.song ?? undefined,
        book: row.book ?? undefined,
        show: row.show ?? undefined,
      }));

      await AsyncStorage.setItem('@journal_entries', JSON.stringify(fresh));
      groupAndSetEntries(fresh);
    } catch (err) {
      console.error('loadEntries failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user, groupAndSetEntries]);

  useFocusEffect(
    useCallback(() => {
      refreshUnlockState();
      loadEntries();

      return () => {
        // when page loses focus, auto-lock
        AsyncStorage.removeItem(JOURNAL_UNLOCK_KEY);
        setIsUnlocked(false);
      };
    }, [refreshUnlockState, loadEntries])
  );

  const handleHeaderLockPress = useCallback(async () => {
    if (isUnlocked) {
      // 🔒 Re-lock instantly (no navigation)
      await AsyncStorage.removeItem(JOURNAL_UNLOCK_KEY);
      setIsUnlocked(false);
      return;
    }

    // 🔓 Currently locked → ask for PIN
    router.push('/(tabs)/more/journal/EnterPin');
  }, [isUnlocked, router]);

  const allEntries = useMemo(() => Object.values(entriesByMonth).flat(), [entriesByMonth]);

  // entries matching the search — locked entries are excluded while locked so
  // their content can't leak through search results
  const filteredByMonth = useMemo(() => {
    if (!query) return entriesByMonth;

    const matches = (e: JournalEntry) => {
      if (e.lock && !isUnlocked) return false;
      const haystack = [
        e.entry, e.location, e.mood,
        e.song?.title, e.song?.artist,
        e.book?.title, e.book?.artist,
        e.show?.title, e.show?.artist,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    };

    const out: Record<string, JournalEntry[]> = {};
    for (const [month, entries] of Object.entries(entriesByMonth)) {
      const found = entries.filter(matches);
      if (found.length > 0) out[month] = found;
    }
    return out;
  }, [entriesByMonth, query, isUnlocked]);

  // wraps matched substrings in a highlight so they pop in the results
  const renderHighlighted = useCallback((text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(searchQuery.trim())})`, 'ig'));
    return parts.map((part, i) =>
      part.toLowerCase() === query
        ? <Text key={i} style={{ backgroundColor: '#FFE066' }}>{part}</Text>
        : part
    );
  }, [query, searchQuery]);

  if (isLoading) {
    return (
      <AppLinearGradient variant="journal.background">
        <PageContainer>
          <PageHeader
            title="Journal"
            showBackButton
            showPlusButton
            navigateIcon={SYSTEM_ICONS.lock}
            onNavigatePress={handleHeaderLockPress}
          />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="small" color={PAGE.journal.primary[0]} />
          </View>
        </PageContainer>
      </AppLinearGradient>
    );
  }

  return (
    <AppLinearGradient variant="journal.background">
      <PageContainer>
        <PageHeader
          title="Journal"
          showBackButton
          showPlusButton
          navigateIcon={isUnlocked ? SYSTEM_ICONS.padlock : SYSTEM_ICONS.lock}
          onNavigatePress={handleHeaderLockPress}
        />

        {/* search — button expands into an inline bar */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 3, marginBottom: 10 }}>
          {searchOpen ? (
            <View style={styles.searchBar}>
              <Image source={SYSTEM_ICONS.search} style={{ width: 15, height: 15, opacity: 0.5 }} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search entries..."
                placeholderTextColor="rgba(0,0,0,0.35)"
                autoFocus
                autoCorrect={false}
                cursorColor={PAGE.journal.border[0]}
                selectionColor={PAGE.journal.border[0]}
              />
              <Pressable onPress={toggleSearch} hitSlop={8}>
                <Text style={{ fontSize: 15, color: '#888' }}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={toggleSearch}>
              <ShadowBox
                contentBackgroundColor={PAGE.journal.foreground[0]}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
              >
                <View style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }}>
                  <Image source={SYSTEM_ICONS.search} style={{ width: 17, height: 17 }} />
                </View>
              </ShadowBox>
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 65 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={{ overflow: 'visible' }}>
            {/* Mood preview — hidden while searching */}
            {allEntries.length > 0 && !query && <MoodPreview entries={allEntries} />}

            {/* no matches */}
            {query.length > 0 && Object.keys(filteredByMonth).length === 0 && (
              <Text style={{ fontFamily: 'label', fontSize: 13, opacity: 0.5, textAlign: 'center', marginTop: 30 }}>
                No entries match "{searchQuery.trim()}"
              </Text>
            )}

            {/* Monthly entries list */}
            {Object.entries(filteredByMonth).map(([month, entries]) => (
              <View key={month} style={{ marginBottom: 25 }}>
                <Text style={styles.monthHeader}>{month}</Text>

                {entries.map(entry => {
                  const date = new Date(entry.date);
                  const formattedDate = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
                  const bgColor = entry.mood
                    ? MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS]
                    : '#fff';

                  const isLong = !!entry.entry && entry.entry.length > 250;

                  const canShowEntry = !entry.lock || isUnlocked;

                  return (
                    <ShadowBox
                      key={entry.id}
                      contentBackgroundColor={bgColor}
                      style={{ marginBottom: 15 }}
                    >
                      <View style={styles.entryCard}>
                        {/* navigates to detail */}
                        <Pressable
                          onPress={() => router.push(`/(tabs)/more/journal/${entry.id}`)}
                          style={{ gap: 8 }}
                        >
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={styles.entryDate}>{formattedDate}</Text>
                            {entry.time && <Text style={styles.entryTime}>{entry.time}</Text>}
                          </View>

                          {/* location OR lock icon */}
                          {canShowEntry ? (
                            entry.location ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Image
                                  source={SYSTEM_ICONS.location}
                                  style={{ width: 15, height: 15, tintColor: COLORS.Secondary, marginRight: 5, marginBottom: 7 }}
                                />
                                <Text style={styles.entryLocation}>{renderHighlighted(entry.location)}</Text>
                              </View>
                            ) : null
                          ) : (
                            <Image source={SYSTEM_ICONS.lock} style={{ width: 15, height: 15 }} />
                          )}
                        </Pressable>

                        {/* media cards */}
                        {entry.song && canShowEntry && (
                          <View style={{ marginTop: 10, marginHorizontal: -10, }}>
                            <SongCard lessContrast song={entry.song} />
                          </View>
                        )}
                        {entry.book && canShowEntry && (
                          <View style={{ marginTop: 10, marginHorizontal: -10, }}>
                            <SongCard lessContrast song={entry.book} type="book" />
                          </View>
                        )}
                        {entry.show && canShowEntry && (
                          <View style={{ marginTop: 10, marginHorizontal: -10, }}>
                            <SongCard lessContrast song={entry.show} type="show" />
                          </View>
                        )}

                        {/* body — expanded while searching so highlights are visible */}
                        {entry.entry && canShowEntry && (() => {
                          const isExpanded = !!expandedIds[entry.id] || query.length > 0;
                          const previewLines = isExpanded ? 999 : 6;

                          return (
                            <View style={{ marginTop: 10 }}>
                              <Text style={styles.entryText} numberOfLines={previewLines}>
                                {renderHighlighted(entry.entry)}
                              </Text>

                              {/* only show toggle if it's long */}
                              {isLong && (
                                <Pressable
                                  onPress={() => toggleExpanded(entry.id)}
                                  style={{ alignSelf: 'flex-start', marginTop: 8 }}
                                >
                                  <Text style={styles.readMore}>
                                    {isExpanded ? 'Read less ←' : 'Read more →'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          );
                        })()}
                      </View>
                    </ShadowBox>
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
                  buttonAction={() => router.push('/more/journal/NewEntry')}
                  buttonColor={PAGE.journal.border[0]}
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
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: PAGE.journal.border[0],
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'p3',
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  monthHeader: {
    fontFamily: 'p2',
    fontSize: 19,
    marginBottom: 10,
  },
  entryCard: {
    padding: 20,
    borderRadius: 15,
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