// @/app/(tabs)/more/journal/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
// gesture-handler scroll + root view so scrolling works inside the filter modal
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';

import MoodPreview from '@/components/journal/MoodPreview';
import SongCard from '@/components/journal/SongCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { syncPendingJournalEntries } from '@/lib/journal/offlineSync';
import { decryptEntryFields, getJournalKey, hasVault } from '@/lib/journal/entryCrypto';
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
const JOURNAL_SORT_KEY = '@journal_sort_order';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default function JournalPage() {
  const router = useRouter();
  const { user } = useAuth();
  // drawer access shows a back button; otherwise the bottom nav
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromDrawer = from === 'drawer';

  const [entriesByMonth, setEntriesByMonth] = useState<Record<string, JournalEntry[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  // encryption is on but this device hasn't been unlocked yet → gate the journal
  const [encLocked, setEncLocked] = useState(false);

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

  // filter modal — moods + year narrow the list, month jump scrolls to a section
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMoods, setFilterMoods] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<number | null>(null);

  // starred-only toggle (the star button in the controls row)
  const [starredOnly, setStarredOnly] = useState(false);
  const filtersActive = filterMoods.length > 0 || filterYear !== null || starredOnly;

  // sort order — persisted so it sticks across sessions
  const [sortOrder, setSortOrder] = useState<'latest' | 'earliest'>('latest');

  useEffect(() => {
    AsyncStorage.getItem(JOURNAL_SORT_KEY).then(stored => {
      if (stored === 'earliest' || stored === 'latest') setSortOrder(stored);
    });
  }, []);

  const toggleSort = useCallback(() => {
    setSortOrder(prev => {
      const next = prev === 'latest' ? 'earliest' : 'latest';
      AsyncStorage.setItem(JOURNAL_SORT_KEY, next);
      return next;
    });
  }, []);

  const toggleFilterMood = useCallback((mood: string) => {
    setFilterMoods(prev =>
      prev.includes(mood) ? prev.filter(m => m !== mood) : [...prev, mood]
    );
  }, []);

  // month section positions for jump-to-month scrolling
  const scrollRef = useRef<ScrollView>(null);
  const monthPositions = useRef<Record<string, number>>({});

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

    // if encryption is on but this device is locked, don't load/save anything —
    // show the unlock gate instead (prevents plaintext writes and blank reads)
    if ((await hasVault(user.id)) && !(await getJournalKey(user.id))) {
      setEncLocked(true);
      setIsLoading(false);
      return;
    }
    setEncLocked(false);

    try {
      setIsLoading(true);

      // 1) load cache immediately (includes any offline-pending entries)
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

      // 2) push any offline-saved entries now that we may have a connection
      try {
        await syncPendingJournalEntries(user.id);
      } catch (e) {
        console.error('journal sync failed:', e);
      }

      // 3) fetch fresh data
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        return; // stay on cache (still holds any pending entries)
      }

      // decrypt the sensitive fields on the way in (legacy plaintext passes through)
      const key = await getJournalKey(user.id);
      const fresh: JournalEntry[] = (data || []).map(row => {
        const dec = decryptEntryFields({ entry: row.entry ?? null, mood: row.mood ?? null }, key);
        return {
          id: row.id,
          date: parseLocalDate(row.date),
          time: row.time,
          mood: dec.mood ?? undefined,
          location: row.location ?? undefined,
          lock: row.is_locked ?? undefined,
          entry: dec.entry ?? undefined,
          song: row.song ?? undefined,
          book: row.book ?? undefined,
          show: row.show ?? undefined,
          starred: row.is_starred ?? false,
        };
      });

      // 4) preserve any entries still pending sync so the server fetch never
      // clobbers an offline create/edit that hasn't uploaded yet — for a pending
      // edit we keep the LOCAL row over the (stale) server one
      const afterSyncRaw = await AsyncStorage.getItem('@journal_entries');
      const afterSync: any[] = afterSyncRaw ? JSON.parse(afterSyncRaw) : [];
      const pendingRows = afterSync.filter(e => e.pendingSync);
      const pendingIds = new Set(pendingRows.map(e => e.id));
      const serverKept = fresh.filter(e => !pendingIds.has(e.id));

      // cache: server rows we kept + pending rows (in their string-date cache shape)
      await AsyncStorage.setItem('@journal_entries', JSON.stringify([...serverKept, ...pendingRows]));

      const merged: JournalEntry[] = [
        ...serverKept,
        ...pendingRows.map(e => ({ ...e, date: parseLocalDate(e.date) })),
      ];
      groupAndSetEntries(merged);
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

  // entries matching search + filters — locked entries are excluded from search
  // while locked so their content can't leak through results
  const filteredByMonth = useMemo(() => {
    if (!query && !filtersActive) return entriesByMonth;

    const matchesSearch = (e: JournalEntry) => {
      if (!query) return true;
      if (e.lock && !isUnlocked) return false;
      const haystack = [
        e.entry, e.location, e.mood,
        e.song?.title, e.song?.artist,
        e.book?.title, e.book?.artist,
        e.show?.title, e.show?.artist,
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(query);
    };

    const matchesFilters = (e: JournalEntry) => {
      if (starredOnly && !e.starred) return false;
      if (filterMoods.length > 0 && (!e.mood || !filterMoods.includes(e.mood))) return false;
      if (filterYear !== null && new Date(e.date).getFullYear() !== filterYear) return false;
      return true;
    };

    const out: Record<string, JournalEntry[]> = {};
    for (const [month, entries] of Object.entries(entriesByMonth)) {
      const found = entries.filter(e => matchesSearch(e) && matchesFilters(e));
      if (found.length > 0) out[month] = found;
    }
    return out;
  }, [entriesByMonth, query, isUnlocked, filterMoods, filterYear, starredOnly, filtersActive]);

  // earliest-first flips both the month order and the entries inside each month
  const displayedByMonth = useMemo(() => {
    if (sortOrder === 'latest') return filteredByMonth;
    const out: Record<string, JournalEntry[]> = {};
    for (const [month, entries] of Object.entries(filteredByMonth).reverse()) {
      out[month] = [...entries].reverse();
    }
    return out;
  }, [filteredByMonth, sortOrder]);

  // progressive rendering: only the first N entries mount, more load on scroll —
  // keeps star/search interactions snappy with a large journal
  const [visibleCount, setVisibleCount] = useState(10);
  const [loadingMore, setLoadingMore] = useState(false);

  // start over when the view fundamentally changes (not on simple entry edits)
  useEffect(() => {
    setVisibleCount(10);
  }, [query, filterMoods, filterYear, starredOnly, sortOrder]);

  const { limitedByMonth, totalShownableCount } = useMemo(() => {
    let remaining = visibleCount;
    let total = 0;
    const out: Record<string, JournalEntry[]> = {};
    for (const [month, entries] of Object.entries(displayedByMonth)) {
      total += entries.length;
      if (remaining > 0) {
        const slice = entries.slice(0, remaining);
        out[month] = slice;
        remaining -= slice.length;
      }
    }
    return { limitedByMonth: out, totalShownableCount: total };
  }, [displayedByMonth, visibleCount]);

  const hasMore = visibleCount < totalShownableCount;

  const handleScroll = useCallback((e: any) => {
    if (!hasMore || loadingMore) return;
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height > contentSize.height - 600) {
      setLoadingMore(true);
      // brief tick so the spinner is visible before the next batch mounts
      setTimeout(() => {
        setVisibleCount(c => c + 15);
        setLoadingMore(false);
      }, 150);
    }
  }, [hasMore, loadingMore]);

  const jumpToMonth = useCallback((month: string) => {
    setFilterOpen(false);
    // make sure everything up to and including that month is rendered
    let needed = 0;
    for (const [m, entries] of Object.entries(displayedByMonth)) {
      needed += entries.length;
      if (m === month) break;
    }
    setVisibleCount(c => Math.max(c, needed));
    // small delay so the modal closes and the batch mounts before scrolling
    setTimeout(() => {
      const y = monthPositions.current[month];
      if (y !== undefined) scrollRef.current?.scrollTo({ y, animated: true });
    }, 300);
  }, [displayedByMonth]);

  // filter modal options, derived from what actually exists in the journal
  const moodsInUse = useMemo(
    () => [...new Set(allEntries.map(e => e.mood).filter(Boolean))] as string[],
    [allEntries]
  );
  const yearsInUse = useMemo(
    () => [...new Set(allEntries.map(e => new Date(e.date).getFullYear()))].sort((a, b) => b - a),
    [allEntries]
  );
  const monthKeys = useMemo(() => Object.keys(displayedByMonth), [displayedByMonth]);

  // wraps matched substrings in a highlight so they pop in the results
  const renderHighlighted = useCallback((text: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${escapeRegExp(searchQuery.trim())})`, 'ig'));
    // guard against pathological splits (e.g. a single common letter matched across a
    // huge entry) producing thousands of Text nodes — that would freeze/crash the list.
    // fall back to the plain (unhighlighted) text in that case.
    if (parts.length > 400) return text;
    return parts.map((part, i) =>
      part.toLowerCase() === query
        ? <Text key={i} style={{ backgroundColor: '#FFE066' }}>{part}</Text>
        : part
    );
  }, [query, searchQuery]);

  // encryption is on but this device is locked → show the unlock gate
  if (encLocked) {
    return (
      <AppLinearGradient variant="journal.background">
        <PageContainer showBottomNav={!fromDrawer}>
          <PageHeader title="Journal" showBackButton={fromDrawer} />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 36, paddingBottom: 60 }}>
            <Image source={SYSTEM_ICONS.lock} style={{ width: 34, height: 34, tintColor: PAGE.journal.primary[0] }} />
            <Text style={{ fontFamily: 'p2', fontSize: 19, color: '#000', textAlign: 'center' }}>Your journal is locked</Text>
            <Text style={{ fontFamily: 'p3', fontSize: 15, color: '#3a3646', textAlign: 'center', lineHeight: 22 }}>
              Enter your passphrase to unlock it on this device.
            </Text>
            <ShadowBox contentBackgroundColor={PAGE.journal.primary[0]} shadowBorderRadius={20} style={{ marginTop: 4 }}>
              <Pressable onPress={() => router.push('/(tabs)/more/journal/SetUpEncryption')} style={{ paddingVertical: 8, paddingHorizontal: 26 }}>
                <Text style={{ fontFamily: 'p2', fontSize: 14, color: '#000' }}>Unlock</Text>
              </Pressable>
            </ShadowBox>
          </View>
        </PageContainer>
      </AppLinearGradient>
    );
  }

  // full-screen loader only on the very first load — on refocus refreshes the
  // list stays mounted so the scroll position is preserved
  if (isLoading && allEntries.length === 0) {
    return (
      <AppLinearGradient variant="journal.background">
        <PageContainer showBottomNav={!fromDrawer}>
          <PageHeader
            title="Journal"
            showBackButton={fromDrawer}
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
      <PageContainer showBottomNav={!fromDrawer}>
        <PageHeader
          title="Journal"
          showBackButton={fromDrawer}
          showPlusButton
          navigateIcon={isUnlocked ? SYSTEM_ICONS.padlock : SYSTEM_ICONS.lock}
          onNavigatePress={handleHeaderLockPress}
        />

        {/* search / filter / sort row */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingHorizontal: 3, marginBottom: 10 }}>
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
            <>
              {/* sort toggle — sticks across sessions */}
              <Pressable onPress={toggleSort}>
                <ShadowBox
                  contentBackgroundColor={PAGE.journal.foreground[0]}
                  contentBorderRadius={20}
                  shadowBorderRadius={20}
                  shadowOffset={{ x: 1, y: 1 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12 }}>
                    <Text style={{ fontFamily: 'p1', fontSize: 13 }}>
                      {sortOrder === 'latest' ? 'Latest' : 'Earliest'}
                    </Text>
                    <Image
                      source={SYSTEM_ICONS.sort}
                      style={{
                        width: 12,
                        height: 12,
                        transform: [{ rotate: sortOrder === 'latest' ? '0deg' : '180deg' }],
                      }}
                    />
                  </View>
                </ShadowBox>
              </Pressable>

              {/* filter */}
              <Pressable onPress={() => setFilterOpen(true)}>
                <ShadowBox
                  contentBackgroundColor={filtersActive ? PAGE.journal.primary[0] : PAGE.journal.foreground[0]}
                  contentBorderRadius={30}
                  shadowBorderRadius={30}
                  shadowOffset={{ x: 1, y: 1 }}
                >
                  <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                    <Image source={SYSTEM_ICONS.list} style={{ width: 16, height: 16 }} />
                  </View>
                </ShadowBox>
              </Pressable>

              {/* starred only */}
              <Pressable onPress={() => setStarredOnly(prev => !prev)}>
                <ShadowBox
                  contentBackgroundColor={starredOnly ? '#FFD581' : PAGE.journal.foreground[0]}
                  contentBorderRadius={30}
                  shadowBorderRadius={30}
                  shadowOffset={{ x: 1, y: 1 }}
                >
                  <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                      source={SYSTEM_ICONS.star}
                      style={{ width: 16, height: 16, tintColor: starredOnly ? '#B8860B' : undefined }}
                    />
                  </View>
                </ShadowBox>
              </Pressable>

              {/* search */}
              <Pressable onPress={toggleSearch}>
                <ShadowBox
                  contentBorderRadius={30}
                  shadowBorderRadius={30}
                  shadowOffset={{ x: 1, y: 1 }}
                >
                  <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                    <Image source={SYSTEM_ICONS.search} style={{ width: 16, height: 16 }} />
                  </View>
                </ShadowBox>
              </Pressable>
            </>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 65 }}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          <View style={{ overflow: 'visible' }}>
            {/* Mood preview — hidden while searching */}
            {allEntries.length > 0 && !query && <MoodPreview entries={allEntries} />}

            {/* no matches */}
            {(query.length > 0 || filtersActive) && Object.keys(displayedByMonth).length === 0 && (
              <Text style={{ fontFamily: 'label', fontSize: 13, opacity: 0.5, textAlign: 'center', marginTop: 30 }}>
                {query.length > 0 ? `No entries match "${searchQuery.trim()}"` : 'No entries match the filters'}
              </Text>
            )}

            {/* Monthly entries list */}
            {Object.entries(limitedByMonth).map(([month, entries]) => (
              <View
                key={month}
                style={{ marginBottom: 25 }}
                onLayout={(e) => { monthPositions.current[month] = e.nativeEvent.layout.y; }}
              >
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
                      {/* whole card navigates to detail — locked entries go through the PIN first */}
                      <Pressable
                        style={styles.entryCard}
                        onPress={() => {
                          if (entry.lock && !isUnlocked) {
                            router.push({
                              pathname: '/(tabs)/more/journal/EnterPin',
                              params: { entryId: entry.id },
                            });
                          } else if (entry.lock) {
                            // globally unlocked — pass proof so the detail page allows it
                            router.push({
                              pathname: '/(tabs)/more/journal/[id]',
                              params: { id: entry.id, unlocked: '1' },
                            });
                          } else {
                            router.push(`/(tabs)/more/journal/${entry.id}`);
                          }
                        }}
                      >
                        <View style={{ gap: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.entryDate, { flex: 1 }]}>{formattedDate}</Text>
                            {entry.time && <Text style={styles.entryTime}>{entry.time}</Text>}
                            {/* starred indicator — toggled from the entry detail page */}
                            {entry.starred && (
                              <Image
                                source={SYSTEM_ICONS.star}
                                style={{ width: 15, height: 15, marginBottom: 5, tintColor: COLORS.Star }}
                              />
                            )}
                          </View>

                          {/* location OR lock icon */}
                          {canShowEntry ? (
                            entry.location ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Image
                                  source={SYSTEM_ICONS.location}
                                  style={{ width: 15, height: 15, tintColor: COLORS.Secondary, marginRight: 5}}
                                />
                                <Text style={styles.entryLocation}>{renderHighlighted(entry.location)}</Text>
                              </View>
                            ) : null
                          ) : (
                            <Image source={SYSTEM_ICONS.lock} style={{ width: 15, height: 15 }} />
                          )}
                        </View>

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
                          // Cap the collapsed preview: handing a very long string to a
                          // <Text numberOfLines> makes iOS measure the WHOLE string to find
                          // the truncation point, which freezes then crashes on huge entries.
                          // A ~6-line preview never needs more than a few hundred chars; when
                          // expanded we drop numberOfLines so there's no truncation measurement.
                          const bodyText = isExpanded || entry.entry.length <= 500
                            ? entry.entry
                            : entry.entry.slice(0, 500);

                          return (
                            <View style={{ marginTop: 10 }}>
                              <Text style={styles.entryText} numberOfLines={isExpanded ? undefined : 6}>
                                {renderHighlighted(bodyText)}
                              </Text>

                              {/* only show toggle if it's long */}
                              {isLong && (
                                <Pressable
                                  onPress={() => toggleExpanded(entry.id)}
                                  style={{ alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                >
                                  <Text style={styles.readMore}>
                                    {isExpanded ? 'Read less' : 'Read more'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          );
                        })()}
                      </Pressable>
                    </ShadowBox>
                  );
                })}
              </View>
            ))}

            {/* loading more spinner */}
            {hasMore && (
              <View style={{ paddingVertical: 15, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={PAGE.journal.primary[0]} />
              </View>
            )}

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
        <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
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

        {/* filter modal */}
        <Modal
          visible={filterOpen}
          transparent
          animationType="none"
          onRequestClose={() => setFilterOpen(false)}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Pressable style={styles.filterOverlay} onPress={() => setFilterOpen(false)}>
              <Pressable style={styles.filterCard} onPress={(e) => e.stopPropagation()}>

                <View style={{ marginTop: 20 }}>
                  <Text style={{ fontFamily: 'p2', fontSize: 18, textAlign: 'center', marginBottom: 16 }}>
                    Filter Entries
                  </Text>
                </View>

                <GHScrollView
                  contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10, gap: 20 }}
                  showsVerticalScrollIndicator={false}
                >
                  {/* moods */}
                  {moodsInUse.length > 0 && (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.filterLabel}>MOODS</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {moodsInUse.map(mood => {
                          const color = MOOD_COLORS[mood as keyof typeof MOOD_COLORS] ?? '#ccc';
                          const isSelected = filterMoods.includes(mood);
                          return (
                            <Pressable key={mood} onPress={() => toggleFilterMood(mood)}>
                              <View style={[
                                styles.filterChip,
                                { borderColor: isSelected ? '#000' : color, backgroundColor: isSelected ? color : '#fff' },
                              ]}>
                                <View style={{ width: 10, height: 10, borderRadius: 4, backgroundColor: color, borderWidth: 1, borderColor: 'rgba(0,0,0,0.25)' }} />
                                <Text style={styles.filterChipText}>{mood}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* years */}
                  {yearsInUse.length > 1 && (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.filterLabel}>YEAR</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {yearsInUse.map(year => {
                          const isSelected = filterYear === year;
                          return (
                            <Pressable key={year} onPress={() => setFilterYear(isSelected ? null : year)}>
                              <View style={[
                                styles.filterChip,
                                { borderColor: isSelected ? '#000' : PAGE.journal.border[0], backgroundColor: isSelected ? PAGE.journal.border[0] : '#fff' },
                              ]}>
                                <Text style={styles.filterChipText}>{year}</Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {/* jump to month */}
                  {monthKeys.length > 0 && (
                    <View style={{ gap: 10 }}>
                      <Text style={styles.filterLabel}>JUMP TO MONTH</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {monthKeys.map(month => (
                          <Pressable key={month} onPress={() => jumpToMonth(month)}>
                            <View style={[styles.filterChip, { borderColor: PAGE.journal.primary[0], backgroundColor: '#fff' }]}>
                              <Text style={styles.filterChipText}>{month}</Text>
                            </View>
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  )}
                </GHScrollView>

                <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, marginTop: 10 }}>
                  <Pressable
                    onPress={() => { setFilterMoods([]); setFilterYear(null); }}
                    style={{ flex: 1 }}
                  >
                    <ShadowBox contentBackgroundColor="#f0f0f0" shadowBorderRadius={15}>
                      <View style={{ paddingVertical: 6 }}>
                        <Text style={{ fontFamily: 'p2', fontSize: 14, textAlign: 'center' }}>Clear</Text>
                      </View>
                    </ShadowBox>
                  </Pressable>

                  <Pressable onPress={() => setFilterOpen(false)} style={{ flex: 1 }}>
                    <ShadowBox contentBackgroundColor={PAGE.journal.border[0]} shadowBorderRadius={15}>
                      <View style={{ paddingVertical: 6 }}>
                        <Text style={{ fontFamily: 'p2', fontSize: 14, textAlign: 'center' }}>Done</Text>
                      </View>
                    </ShadowBox>
                  </Pressable>
                </View>

              </Pressable>
            </Pressable>
          </GestureHandlerRootView>
        </Modal>
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
  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: PAGE.journal.border[0],
    maxHeight: '80%',
    width: '90%',
    alignSelf: 'center',
  },
  filterLabel: {
    fontFamily: 'label',
    fontSize: 11,
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    borderWidth: 1,
  },
  filterChipText: {
    fontFamily: 'p1',
    fontSize: 12,
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