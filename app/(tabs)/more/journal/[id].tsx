// app/(tabs)/more/journal/[id].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
// RN's ScrollView doesn't scroll inside these modals — use gesture-handler's
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

import SongCard from '@/components/journal/SongCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { markJournalEntrySynced, upsertJournalCacheRow } from '@/lib/journal/offlineSync';
import MoodPickerModal from '@/modals/MoodPickerModal';
import SongPickerModal, { SongData } from '@/modals/SongPickerModal';
import { JournalEntry } from '@/types/JournalEntry';

import { BUTTON_COLORS, COLORS, MAIN_MOOD_COLORS, MOOD_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel, pickerStyles } from '@/ui/TimeWheel';
import ToggleRow from '@/ui/ToggleRow';
import {
  formatDisplayDate as formatPillDate,
  formatDisplayTime,
  formatLocalDate,
  parseLocalDate,
} from '@/utils/dateUtils';
import { globalStyles, journalStyle } from '@/styles';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatLongDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// "3:45 PM" → hours/minutes; falls back to noon for unparseable strings
function parseTimeString(time: string | undefined): { hour: number; minute: number } {
  const match = time?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return { hour: 12, minute: 0 };
  let hour = Number(match[1]) % 12;
  if (match[3]?.toUpperCase() === 'PM') hour += 12;
  return { hour, minute: Number(match[2]) };
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

// ─── main page ────────────────────────────────────────────────────────────────

export default function JournalEntryDetail() {
  // `unlocked` is proof from the index/PIN flow that this locked entry may open
  const { id, unlocked } = useLocalSearchParams<{ id: string; unlocked?: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // edit state — mirrors the new entry page
  const [editDateTime, setEditDateTime] = useState<Date>(() => new Date());
  const [editedEntry, setEditedEntry] = useState('');
  const [editedMood, setEditedMood] = useState<keyof typeof MOOD_COLORS | null>(null);
  const [extraMood, setExtraMood] = useState<keyof typeof MOOD_COLORS | null>(null);
  const [editedLocation, setEditedLocation] = useState('');
  const [editedLock, setEditedLock] = useState(false);
  const [editedSong, setEditedSong] = useState<SongData | null>(null);
  const [editedBook, setEditedBook] = useState<SongData | null>(null);
  const [editedShow, setEditedShow] = useState<SongData | null>(null);

  // UI state
  const [moodModalOpen, setMoodModalOpen] = useState(false);
  const [mediaPicker, setMediaPicker] = useState<'song' | 'book' | 'show' | null>(null);

  // date/time picker modal state (temp values until Save)
  const [dateTimeModalOpen, setDateTimeModalOpen] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(() => new Date());
  const [tempHour, setTempHour] = useState('12');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempMeridiem, setTempMeridiem] = useState<'AM' | 'PM'>('AM');

  // journal input scroll/focus handling (same as new entry page)
  const inputRef = useRef<TextInput>(null);

  const BASE_MOODS = Object.keys(MAIN_MOOD_COLORS) as (keyof typeof MAIN_MOOD_COLORS)[];
  const displayedMoods: (keyof typeof MOOD_COLORS)[] = extraMood
    ? [BASE_MOODS[0], BASE_MOODS[1], extraMood, BASE_MOODS[3], BASE_MOODS[4]]
    : BASE_MOODS;

  // ── load ──────────────────────────────────────────────────────────────────

  const populateEditState = (e: JournalEntry) => {
    const { hour, minute } = parseTimeString(e.time);
    const dt = new Date(e.date);
    dt.setHours(hour, minute, 0, 0);
    setEditDateTime(dt);
    setEditedEntry(e.entry ?? '');
    const mood = (e.mood as keyof typeof MOOD_COLORS) ?? null;
    setEditedMood(mood);
    setExtraMood(mood && !BASE_MOODS.includes(mood as keyof typeof MAIN_MOOD_COLORS) ? mood : null);
    setEditedLocation(e.location ?? '');
    setEditedLock(!!e.lock);
    setEditedSong(e.song ?? null);
    setEditedBook(e.book ?? null);
    setEditedShow(e.show ?? null);
  };

  const loadEntry = useCallback(async () => {
    if (!user || !id) return;
    setLoading(true);

    try {
      // try cache first
      const cached = await AsyncStorage.getItem('@journal_entries');
      if (cached) {
        const entries: JournalEntry[] = JSON.parse(cached);
        const found = entries.find(e => e.id === id);
        if (found) {
          // locked entries need unlock proof — bounce to the PIN before showing anything
          if (found.lock && unlocked !== '1') {
            router.replace({ pathname: '/(tabs)/more/journal/EnterPin', params: { entryId: id } });
            return;
          }
          const parsed = { ...found, date: parseLocalDate(found.date as any) };
          setEntry(parsed as JournalEntry);
          populateEditState(parsed as JournalEntry);
        }
      }

      // always refresh from Supabase
      const { data, error } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        if (!entry) router.back();
        return;
      }

      // same lock guard for the fresh copy (covers cache misses)
      if (data.is_locked && unlocked !== '1') {
        router.replace({ pathname: '/(tabs)/more/journal/EnterPin', params: { entryId: id } });
        return;
      }

      const fresh: JournalEntry = {
        id: data.id,
        date: parseLocalDate(data.date),
        time: data.time,
        mood: data.mood ?? undefined,
        location: data.location ?? undefined,
        lock: data.is_locked ? '1' : undefined,
        entry: data.entry ?? undefined,
        song: data.song ?? undefined,
        book: data.book ?? undefined,
        show: data.show ?? undefined,
        starred: data.is_starred ?? false,
      } as JournalEntry;

      setEntry(fresh);
      populateEditState(fresh);
    } catch (err) {
      console.error('Failed to load entry:', err);
    } finally {
      setLoading(false);
    }
  }, [user, id, unlocked]);

  useEffect(() => { loadEntry(); }, [loadEntry]);

  // ── mood handlers (same behavior as new entry page) ───────────────────────

  const handleMoodPress = (mood: keyof typeof MOOD_COLORS) => {
    setEditedMood(editedMood === mood ? null : mood);
  };

  const handleMoodModalSelect = (mood: keyof typeof MOOD_COLORS) => {
    setEditedMood(mood);
    setMoodModalOpen(false);
    if (BASE_MOODS.includes(mood as keyof typeof MAIN_MOOD_COLORS)) {
      setExtraMood(null);
    } else {
      setExtraMood(mood);
    }
  };

  // ── date/time modal ───────────────────────────────────────────────────────

  const openDateTimeModal = () => {
    setTempDate(editDateTime);
    const hours = editDateTime.getHours();
    const isPM = hours >= 12;
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    setTempHour(String(hour12));
    setTempMinute(String(editDateTime.getMinutes()).padStart(2, '0'));
    setTempMeridiem(isPM ? 'PM' : 'AM');
    setDateTimeModalOpen(true);
  };

  const handleSaveDateTime = () => {
    const hour24 =
      tempMeridiem === 'AM'
        ? tempHour === '12' ? 0 : Number(tempHour)
        : tempHour === '12' ? 12 : Number(tempHour) + 12;

    const combined = new Date(tempDate);
    combined.setHours(hour24, Number(tempMinute), 0, 0);
    setEditDateTime(combined);
    setDateTimeModalOpen(false);
  };

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || !entry) return;
    setIsSaving(true);

    const dateStr = formatLocalDate(editDateTime);
    const timeStr = formatDisplayTime(editDateTime);

    try {
      // 1) write the edit to the cache first, flagged pending until it syncs.
      // merges over the existing row so fields like starred/created_at are kept.
      await upsertJournalCacheRow({
        id: entry.id,
        date: dateStr,
        time: timeStr,
        mood: editedMood ?? null,
        location: editedLocation.trim() || null,
        entry: editedEntry.trim() || null,
        lock: editedLock,
        song: editedSong ?? null,
        book: editedBook ?? null,
        show: editedShow ?? null,
        pendingSync: true,
      });

      // 2) reflect changes locally right away
      setEntry(prev => prev ? {
        ...prev,
        date: editDateTime,
        time: timeStr,
        mood: editedMood ?? undefined,
        location: editedLocation.trim() || undefined,
        entry: editedEntry.trim() || undefined,
        lock: editedLock ? '1' : undefined,
        song: editedSong ?? undefined,
        book: editedBook ?? undefined,
        show: editedShow ?? undefined,
      } as JournalEntry : prev);
      setIsEditMode(false);

      // 3) try to push now; if offline it stays pending and the journal list
      // retries the sync next time it loads with a connection
      const { error } = await supabase
        .from('journal_entries')
        .update({
          date: dateStr,
          time: timeStr,
          mood: editedMood ?? null,
          location: editedLocation.trim() || null,
          entry: editedEntry.trim() || null,
          is_locked: editedLock,
          song: editedSong ?? null,
          book: editedBook ?? null,
          show: editedShow ?? null,
        })
        .eq('id', entry.id)
        .eq('user_id', user.id);

      if (error) {
        console.error('Save failed (will retry):', error);
        Alert.alert('Saved Locally', 'Your changes are saved on this device and will sync when you have a connection.');
      } else {
        await markJournalEntrySynced(entry.id);
      }
    } catch (err) {
      console.error('Save failed (will retry):', err);
      Alert.alert('Saved Locally', 'Your changes are saved on this device and will sync when you have a connection.');
    } finally {
      setIsSaving(false);
    }
  };

  // ── delete ────────────────────────────────────────────────────────────────

  const handleDelete = () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // deletes require a connection — unlike creates/edits we don't queue
              // them, so we never remove locally until the server delete succeeds
              const { error } = await supabase
                .from('journal_entries')
                .delete()
                .eq('id', id)
                .eq('user_id', user?.id);

              if (error) throw error;

              // remove from cache only after the server confirms the delete
              const cached = await AsyncStorage.getItem('@journal_entries');
              if (cached) {
                const entries: JournalEntry[] = JSON.parse(cached);
                await AsyncStorage.setItem(
                  '@journal_entries',
                  JSON.stringify(entries.filter(e => e.id !== id))
                );
              }

              router.back();
            } catch (err) {
              console.error('Delete failed:', err);
              Alert.alert(
                "Couldn't delete",
                "Deleting an entry needs an internet connection. Please try again when you're back online."
              );
            }
          },
        },
      ]
    );
  };

  // ── star / bookmark ───────────────────────────────────────────────────────

  const handleToggleStar = async () => {
    if (!entry || !user) return;
    // compute the new value up front so the DB write can't race the state update
    const newValue = !entry.starred;
    setEntry(prev => prev ? { ...prev, starred: newValue } : prev);

    try {
      const { error } = await supabase
        .from('journal_entries')
        .update({ is_starred: newValue })
        .eq('id', entry.id)
        .eq('user_id', user.id);
      if (error) throw error;

      const cached = await AsyncStorage.getItem('@journal_entries');
      if (cached) {
        const entries: any[] = JSON.parse(cached);
        await AsyncStorage.setItem(
          '@journal_entries',
          JSON.stringify(entries.map(e => e.id === entry.id ? { ...e, starred: newValue } : e))
        );
      }
    } catch (err) {
      console.error('Failed to save star:', err);
      // revert on failure
      setEntry(prev => prev ? { ...prev, starred: !newValue } : prev);
    }
  };

  // ── cancel edit ───────────────────────────────────────────────────────────

  const handleCancelEdit = () => {
    if (entry) populateEditState(entry);
    setIsEditMode(false);
  };

  // ── loading ───────────────────────────────────────────────────────────────

  if (loading || !entry) {
    return (
      <AppLinearGradient variant="journal.background">
        <PageContainer>
          <PageHeader title="" showBackButton />
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator color={PAGE.journal.primary[0]} />
          </View>
        </PageContainer>
      </AppLinearGradient>
    );
  }

  const moodColor = entry.mood
    ? MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS]
    : PAGE.journal.foreground[0];

  // ── view mode ─────────────────────────────────────────────────────────────

  if (!isEditMode) {
    return (
      <AppLinearGradient variant="journal.background">
        <PageContainer>
          <PageHeader
            title=""
            showBackButton
          />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 80 }}
            showsVerticalScrollIndicator={false}
          >
            <ShadowBox
              contentBackgroundColor={moodColor}
              shadowOffset={{ x: 0, y: 0 }}
            >
              <View style={styles.entryCard}>
                {/* date + time row */}
                <View style={styles.headerRow}>
                  <Text style={styles.dateText}>
                    {formatLongDate(new Date(entry.date))}
                  </Text>
                  {entry.time && (
                    <Text style={styles.timeText}>{entry.time}</Text>
                  )}
                </View>

                {/* mood badge */}
                {entry.mood && (
                  <View style={styles.moodBadge}>
                    <ShadowBox
                        contentBackgroundColor={moodColor}
                        contentBorderColor={'#000'}
                        contentBorderRadius={6}
                        shadowBorderRadius={6}
                        shadowOffset={{ x: 1, y: 1 }}
                      >
                        <View style={{ width: 15, height: 15 }} />
                      </ShadowBox>
                    <Text style={journalStyle.moodLabel}>{entry.mood}</Text>
                  </View>
                )}

                {/* location */}
                {entry.location && (
                  <View style={styles.locationRow}>
                    <Image
                      source={SYSTEM_ICONS.location}
                      style={{ width: 14, height: 14, tintColor: COLORS.Secondary, marginRight: 4 }}
                    />
                    <Text style={styles.locationText}>{entry.location}</Text>
                  </View>
                )}

                {/* media cards */}
                {entry.song && (
                  <View style={{ marginTop: 12, marginHorizontal: -10 }}>
                    <SongCard lessContrast song={entry.song} />
                  </View>
                )}
                {entry.book && (
                  <View style={{ marginTop: 12, marginHorizontal: -10 }}>
                    <SongCard lessContrast song={entry.book} type="book" />
                  </View>
                )}
                {entry.show && (
                  <View style={{ marginTop: 12, marginHorizontal: -10 }}>
                    <SongCard lessContrast song={entry.show} type="show" />
                  </View>
                )}

                {/* lock indicator */}
                {entry.lock && (
                  <View style={styles.locationRow}>
                    <Image source={SYSTEM_ICONS.lock} style={{ width: 14, height: 14, marginRight: 4 }} />
                    <Text style={styles.locationText}>Locked</Text>
                  </View>
                )}

                {/* entry text */}
                {entry.entry && (
                  <Text style={styles.entryText}>{entry.entry}</Text>
                )}
              </View>
            </ShadowBox>
          </ScrollView>

          {/* floating action buttons */}
          <View style={styles.fab}>
            {/* star / bookmark */}
            <Pressable onPress={handleToggleStar}>
              <ShadowBox
                contentBackgroundColor={entry.starred ? '#FFD581' : PAGE.journal.foreground[0]}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
              >
                <View style={styles.fabBtn}>
                  <Image
                    source={SYSTEM_ICONS.star}
                    style={[styles.fabIcon, { tintColor: entry.starred ? COLORS.Star : 'rgba(0,0,0,0.35)' }]}
                  />
                </View>
              </ShadowBox>
            </Pressable>

            {/* delete */}
            <Pressable onPress={handleDelete}>
              <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Delete}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
              >
                <View style={styles.fabBtn}>
                  <Image source={SYSTEM_ICONS.delete} style={[styles.fabIcon,]} />
                </View>
              </ShadowBox>
            </Pressable>

            {/* edit */}
            <Pressable onPress={() => setIsEditMode(true)}>
              <ShadowBox
                contentBackgroundColor={PAGE.journal.border[0]}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
              >
                <View style={styles.fabBtn}>
                  <Image source={SYSTEM_ICONS.write} style={styles.fabIcon} />
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </PageContainer>
      </AppLinearGradient>
    );
  }

  // ── edit mode: identical layout to the new entry page ─────────────────────

  return (
    <AppLinearGradient variant="journal.background">
      <PageContainer>
        <PageHeader title="Edit Entry" showBackButton />

        {/* date / time pill — tap to change */}
        <Pressable
          onPress={openDateTimeModal}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#000',
            backgroundColor: COLORS.PrimaryLight,
            alignSelf: 'center',
            marginBottom: 10,
          }}
        >
          <Text style={[globalStyles.body2, { fontSize: 13 }]}>
            {formatPillDate(editDateTime)}  •  {formatDisplayTime(editDateTime)}
          </Text>
        </Pressable>

        <KeyboardAwareScrollView
          enableOnAndroid={true}
          enableAutomaticScroll={true}
          extraScrollHeight={110}
          // remove bounce when typing a long entry
          enableResetScrollToCoords={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* lock entry */}
          <ToggleRow
            label="Lock entry?"
            value={editedLock}
            onValueChange={setEditedLock}
            trackColorTrue={PAGE.journal.border[0]}
          />

          {/* mood */}
          <Text style={[globalStyles.body, { marginBottom: 10 }]}>Mood</Text>

          <View style={journalStyle.card}>
            <View style={journalStyle.moodRow}>
              {displayedMoods.map((mood) => {
                const color = MOOD_COLORS[mood];
                return (
                  <View key={mood} style={journalStyle.moodItem}>
                    <Pressable onPress={() => handleMoodPress(mood)}>
                      <ShadowBox
                        contentBackgroundColor={editedMood === mood ? color : '#F9F8FF'}
                        contentBorderColor={editedMood === mood ? '#000' : color}
                        contentBorderRadius={7}
                        shadowColor={editedMood === mood ? '#000' : color}
                        shadowBorderColor={editedMood === mood ? '#000' : color}
                        shadowBorderRadius={7}
                        shadowOffset={{ x: 2, y: 2 }}
                      >
                        <View style={{ width: 20, height: 20 }} />
                      </ShadowBox>
                    </Pressable>
                    <Text style={journalStyle.moodLabel}>{mood}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Pressable onPress={() => setMoodModalOpen(true)}>
            <Text
              style={[
                globalStyles.label,
                {
                  textAlign: 'center',
                  opacity: 0.5,
                  fontSize: 11,
                  margin: 10,
                },
              ]}
            >
              More
            </Text>
          </Pressable>

          {/* location */}
          <Text style={[globalStyles.body, { marginBottom: 10 }]}>Location</Text>
          <View style={journalStyle.locationCard}>
            <TextInput
              style={[
                globalStyles.body,
                {
                  paddingHorizontal: 10,
                  paddingVertical: 10,
                  lineHeight: 18,
                },
              ]}
              placeholder="Where are you right now?"
              placeholderTextColor="rgba(0,0,0,0.5)"
              value={editedLocation}
              onChangeText={setEditedLocation}
              cursorColor={PAGE.journal.border[0]}
              selectionColor={PAGE.journal.border[0]}
            />
          </View>

          {/* journal */}
          <Text style={[globalStyles.body, { marginBottom: 10 }]}>Journal</Text>

          {/* media card previews above the text box */}
          {editedSong && (
            <SongCard
              song={editedSong}
              onRemove={() => setEditedSong(null)}
            />
          )}
          {editedBook && (
            <SongCard
              song={editedBook}
              type="book"
              onRemove={() => setEditedBook(null)}
            />
          )}
          {editedShow && (
            <SongCard
              song={editedShow}
              type="show"
              onRemove={() => setEditedShow(null)}
            />
          )}

          <View style={journalStyle.journalCard}>
            <View>
              <TextInput
                ref={inputRef}
                style={[
                  globalStyles.body,
                  journalStyle.textArea,
                  {
                    lineHeight: 20,
                    minHeight: 200,
                  }
                ]}
                placeholder="What are your thoughts?"
                multiline
                textAlignVertical="top"
                cursorColor={PAGE.journal.border[0]}
                selectionColor={PAGE.journal.border[0]}
                placeholderTextColor="rgba(0,0,0,0.5)"
                value={editedEntry}
                onChangeText={setEditedEntry}
              />
            </View>

            {/* faint action row */}
            <View style={{
              flexDirection: 'row',
              borderTopWidth: 1,
              borderTopColor: 'rgba(0,0,0,0.06)',
              paddingVertical: 10,
              paddingHorizontal: 10,
              gap: 16,
            }}>
              <Pressable
                onPress={() => setMediaPicker('song')}
                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, flexDirection: 'row', alignItems: 'center', gap: 5 })}
              >
                <Image
                  source={SYSTEM_ICONS.musicNote}
                  style={{ width: 14, height: 14 }}
                />
                <Text style={{ fontFamily: 'p1', fontSize: 12, color: 'rgba(0,0,0,0.3)' }} numberOfLines={1}>
                  {editedSong ? editedSong.title : 'add song'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMediaPicker('book')}
                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 })}
              >
                <Image
                  source={SYSTEM_ICONS.journal}
                  style={{ width: 14, height: 14, opacity: 0.4 }}
                />
                <Text style={{ fontFamily: 'p1', fontSize: 12, color: 'rgba(0,0,0,0.3)' }} numberOfLines={1}>
                  {editedBook ? editedBook.title : 'add book'}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setMediaPicker('show')}
                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 })}
              >
                <Image
                  source={SYSTEM_ICONS.show}
                  style={{ width: 14, height: 14, opacity: 0.4 }}
                />
                <Text style={{ fontFamily: 'p1', fontSize: 12, color: 'rgba(0,0,0,0.3)' }} numberOfLines={1}>
                  {editedShow ? editedShow.title : 'add show'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* cancel / save — standard page button dimensions */}
          <View style={{ flexDirection: 'row', gap: 10, margin: 20, justifyContent: 'center' }}>
            <Pressable onPress={handleCancelEdit} style={{ flex: 1, maxWidth: 100 }}>
              <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={20}>
                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                  <Text style={globalStyles.body}>Cancel</Text>
                </View>
              </ShadowBox>
            </Pressable>

            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={{ flex: 1, maxWidth: 100, opacity: isSaving ? 0.6 : 1 }}
            >
              <ShadowBox contentBackgroundColor={PAGE.journal.border[0]} shadowBorderRadius={20}>
                <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                  <Text style={globalStyles.body}>
                    {isSaving ? 'Saving...' : 'Save'}
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </KeyboardAwareScrollView>

        {/* mood picker modal */}
        <MoodPickerModal
          visible={moodModalOpen}
          selectedMood={editedMood}
          onClose={() => setMoodModalOpen(false)}
          onSelect={handleMoodModalSelect}
        />

        {/* media picker (song / book / show) */}
        <SongPickerModal
          visible={mediaPicker !== null}
          mediaType={mediaPicker ?? 'song'}
          onClose={() => setMediaPicker(null)}
          onSelect={(s) => {
            // one media log at a time — picking a new type replaces the old one
            setEditedSong(mediaPicker === 'song' ? s : null);
            setEditedBook(mediaPicker === 'book' ? s : null);
            setEditedShow(mediaPicker === 'show' ? s : null);
          }}
        />

        {/* date + time picker for the entry */}
        <Modal
          visible={dateTimeModalOpen}
          transparent
          animationType="none"
          onRequestClose={() => setDateTimeModalOpen(false)}
        >
          <Pressable style={dtStyles.overlay} onPress={() => setDateTimeModalOpen(false)}>
            <Pressable style={dtStyles.card} onPress={(e) => e.stopPropagation()}>

              <View style={{ marginTop: 20 }}>
                <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 16 }]}>
                  Entry Date & Time
                </Text>
              </View>

              <GHScrollView
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10, gap: 16 }}
                showsVerticalScrollIndicator={false}
              >
                <ShadowBox>
                  <SimpleCalendar
                    selectedDate={tempDate}
                    onSelectDate={setTempDate}
                    selectedDateColor={PAGE.journal.border[0]}
                  />
                </ShadowBox>

                <View style={pickerStyles.container}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                    <TimeWheel data={HOURS} selected={tempHour} onSelect={setTempHour} />
                    <TimeWheel data={MINUTES} selected={tempMinute} onSelect={setTempMinute} />
                    <TimeWheel
                      data={MERIDIEM}
                      selected={tempMeridiem}
                      onSelect={(value) => setTempMeridiem(value as 'AM' | 'PM')}
                    />
                  </View>
                </View>
              </GHScrollView>

              <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                <Pressable onPress={() => setDateTimeModalOpen(false)} style={{ flex: 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                    </View>
                  </ShadowBox>
                </Pressable>

                <Pressable onPress={handleSaveDateTime} style={{ flex: 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>Save</Text>
                    </View>
                  </ShadowBox>
                </Pressable>
              </View>

            </Pressable>
          </Pressable>
        </Modal>
      </PageContainer>
    </AppLinearGradient>
  );
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  entryCard: {
    padding: 20,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontFamily: 'p1',
    fontSize: 15,
    flex: 1,
  },
  timeText: {
    fontFamily: 'p2',
    fontSize: 14,
  },
  moodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: BUTTON_COLORS.Quiet
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontFamily: 'label',
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  entryText: {
    fontFamily: 'p3',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 50,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    zIndex: 5,
  },
  fabBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    width: 20,
    height: 20,
  },
});

const dtStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: PAGE.journal.border[0],
    maxHeight: '85%',
    width: '90%',
    alignSelf: 'center',
  },
});
