// app/(tabs)/more/journal/[id].tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import SongCard from '@/components/journal/SongCard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import MoodPickerModal from '@/modals/MoodPickerModal';
import { JournalEntry } from '@/types/JournalEntry';

import { BUTTON_COLORS, COLORS, MOOD_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { formatLocalDate, parseLocalDate } from '@/utils/dateUtils';
import { globalStyles, journalStyle } from '@/styles';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function generateTimeOptions(): string[] {
  const times: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const hour = h % 12 === 0 ? 12 : h % 12;
      const minute = m.toString().padStart(2, '0');
      const period = h < 12 ? 'AM' : 'PM';
      times.push(`${hour}:${minute} ${period}`);
    }
  }
  return times;
}

const TIME_OPTIONS = generateTimeOptions();

// ─── main page ────────────────────────────────────────────────────────────────

export default function JournalEntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // edit state
  const [editedEntry, setEditedEntry] = useState('');
  const [editedMood, setEditedMood] = useState<string | null>(null);
  const [editedLocation, setEditedLocation] = useState('');
  const [editedDate, setEditedDate] = useState<Date>(new Date());
  const [editedTime, setEditedTime] = useState('');
  const [editedLock, setEditedLock] = useState(false);
  const [editedSong, setEditedSong] = useState<any>(null);

  // UI state
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // ── load ──────────────────────────────────────────────────────────────────

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

      const fresh: JournalEntry = {
        id: data.id,
        date: parseLocalDate(data.date),
        time: data.time,
        mood: data.mood ?? undefined,
        location: data.location ?? undefined,
        lock: data.is_locked ? '1' : undefined,
        entry: data.entry ?? undefined,
        song: data.song ?? undefined,
      } as JournalEntry;

      setEntry(fresh);
      populateEditState(fresh);
    } catch (err) {
      console.error('Failed to load entry:', err);
    } finally {
      setLoading(false);
    }
  }, [user, id]);

  useEffect(() => { loadEntry(); }, [loadEntry]);

  const populateEditState = (e: JournalEntry) => {
    setEditedEntry(e.entry ?? '');
    setEditedMood(e.mood ?? null);
    setEditedLocation(e.location ?? '');
    setEditedDate(new Date(e.date));
    setEditedTime(e.time ?? '');
    setEditedLock(!!e.lock);
    setEditedSong((e as any).song ?? null);
  };

  // ── save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || !entry) return;
    setIsSaving(true);

    try {
      const dateStr = formatLocalDate(editedDate);

      const { error } = await supabase
        .from('journal_entries')
        .update({
          date: dateStr,
          time: editedTime,
          mood: editedMood ?? null,
          location: editedLocation.trim() || null,
          entry: editedEntry.trim() || null,
          is_locked: editedLock,
          song: editedSong ?? null,
        })
        .eq('id', entry.id)
        .eq('user_id', user.id);

      if (error) throw error;

      // update local cache
      const cached = await AsyncStorage.getItem('@journal_entries');
      if (cached) {
        const entries: JournalEntry[] = JSON.parse(cached);
        const updated = entries.map(e =>
          e.id === entry.id
            ? {
                ...e,
                date: dateStr,
                time: editedTime,
                mood: editedMood ?? undefined,
                location: editedLocation.trim() || undefined,
                entry: editedEntry.trim() || undefined,
                lock: editedLock ? '1' : undefined,
                song: editedSong ?? undefined,
              }
            : e
        );
        await AsyncStorage.setItem('@journal_entries', JSON.stringify(updated));
      }

      // reflect changes locally
      setEntry(prev => prev ? {
        ...prev,
        date: editedDate,
        time: editedTime,
        mood: editedMood ?? undefined,
        location: editedLocation.trim() || undefined,
        entry: editedEntry.trim() || undefined,
        lock: editedLock ? '1' : undefined,
        song: editedSong ?? undefined,
      } as JournalEntry : prev);

      setIsEditMode(false);
    } catch (err) {
      console.error('Save failed:', err);
      Alert.alert('Error', 'Failed to save changes.');
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
              await supabase
                .from('journal_entries')
                .delete()
                .eq('id', id)
                .eq('user_id', user?.id);

              // remove from cache
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
              Alert.alert('Error', 'Failed to delete entry.');
            }
          },
        },
      ]
    );
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

  const editedMoodColor = editedMood
    ? MOOD_COLORS[editedMood as keyof typeof MOOD_COLORS]
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
              shadowColor={PAGE.journal.border[0]}
            >
              <View style={styles.entryCard}>
                {/* date + time row */}
                <View style={styles.headerRow}>
                  <Text style={styles.dateText}>
                    {formatDisplayDate(new Date(entry.date))}
                  </Text>
                  {entry.time && (
                    <Text style={styles.timeText}>{entry.time}</Text>
                  )}
                </View>

                {/* mood badge */}
                {entry.mood && (
                  <View style={[styles.moodBadge, { backgroundColor: moodColor }]}>
                    <View
                      style={[
                        styles.moodDot,
                        {
                          backgroundColor: moodColor,
                          borderColor: '#000',
                          shadowColor: '#000',
                          shadowOffset: { width: 1, height: 1 },
                          shadowOpacity: 1,
                          shadowRadius: 0,
                        },
                      ]}
                    />
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

                {/* song */}
                {(entry as any).song && (
                  <View style={{ marginTop: 12, marginHorizontal: -10 }}>
                    <SongCard lessContrast song={(entry as any).song} />
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
            {/* delete */}
            <Pressable onPress={handleDelete}>
              <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Delete}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
              >
                <View style={styles.fabBtn}>
                  <Image source={SYSTEM_ICONS.delete} style={[styles.fabIcon, { tintColor: '#fff' }]} />
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

  // ── edit mode ─────────────────────────────────────────────────────────────

  return (
    <AppLinearGradient variant="journal.background">
      <PageContainer>
        <PageHeader title="Edit Entry" showBackButton />

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── date ── */}
          <Text style={styles.sectionLabel}>DATE</Text>
          <Pressable onPress={() => setShowDatePicker(!showDatePicker)}>
            <ShadowBox
              contentBackgroundColor={PAGE.journal.foreground[0]}
              shadowColor={PAGE.journal.border[0]}
              style={{ marginBottom: 12 }}
            >
              <View style={styles.row}>
                <Image source={SYSTEM_ICONS.calendar} style={styles.rowIcon} />
                <Text style={globalStyles.body}>{formatDisplayDate(editedDate)}</Text>
                <Image source={SYSTEM_ICONS.sort} style={styles.chevron} />
              </View>
            </ShadowBox>
          </Pressable>

          {/* inline month calendar */}
          {showDatePicker && (
            <ShadowBox
              contentBackgroundColor="#fff"
              shadowColor={PAGE.journal.border[0]}
              style={{ marginBottom: 12 }}
            >
              <View style={{ padding: 12 }}>
                <InlineCalendar
                  selectedDate={editedDate}
                  onSelect={(d) => {
                    setEditedDate(d);
                    setShowDatePicker(false);
                  }}
                />
              </View>
            </ShadowBox>
          )}

          {/* ── time ── */}
          <Text style={styles.sectionLabel}>TIME</Text>
          <Pressable onPress={() => setShowTimePicker(!showTimePicker)}>
            <ShadowBox
              contentBackgroundColor={PAGE.journal.foreground[0]}
              shadowColor={PAGE.journal.border[0]}
              style={{ marginBottom: 4 }}
            >
              <View style={styles.row}>
                <Image source={SYSTEM_ICONS.clock} style={styles.rowIcon} />
                <Text style={globalStyles.body}>{editedTime || 'No time set'}</Text>
                <Image source={SYSTEM_ICONS.sort} style={styles.chevron} />
              </View>
            </ShadowBox>
          </Pressable>

          {showTimePicker && (
            <ShadowBox
              contentBackgroundColor="#fff"
              shadowColor={PAGE.journal.border[0]}
              style={{ marginBottom: 12 }}
            >
              <ScrollView
                style={{ maxHeight: 180 }}
                showsVerticalScrollIndicator={false}
              >
                {TIME_OPTIONS.map(t => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setEditedTime(t);
                      setShowTimePicker(false);
                    }}
                    style={[
                      styles.timeOption,
                      t === editedTime && { backgroundColor: PAGE.journal.border[0] + '33' },
                    ]}
                  >
                    <Text style={[globalStyles.body, t === editedTime && { fontFamily: 'p2' }]}>
                      {t}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </ShadowBox>
          )}

          {/* ── mood ── */}
          <Text style={styles.sectionLabel}>MOOD</Text>
          <Pressable onPress={() => setShowMoodPicker(true)}>
            <ShadowBox
              contentBackgroundColor={editedMoodColor}
              shadowColor={PAGE.journal.border[0]}
              style={{ marginBottom: 12 }}
            >
              <View style={styles.row}>
                <View
                  style={[
                    styles.moodDot,
                    {
                      backgroundColor: editedMoodColor,
                      borderColor: '#000',
                      shadowColor: '#000',
                      shadowOffset: { width: 1, height: 1 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                    },
                  ]}
                />
                <Text style={globalStyles.body}>{editedMood ?? 'No mood set'}</Text>
                {editedMood && (
                  <Pressable
                    onPress={() => setEditedMood(null)}
                    style={{ marginLeft: 'auto' }}
                    hitSlop={8}
                  >
                    <Text style={styles.clearBtn}>✕</Text>
                  </Pressable>
                )}
                {!editedMood && (
                  <Image source={SYSTEM_ICONS.sort} style={styles.chevron} />
                )}
              </View>
            </ShadowBox>
          </Pressable>

          {/* ── location ── */}
          <Text style={styles.sectionLabel}>LOCATION</Text>
          <ShadowBox
            contentBackgroundColor={PAGE.journal.foreground[0]}
            shadowColor={PAGE.journal.border[0]}
            style={{ marginBottom: 12 }}
          >
            <View style={styles.row}>
              <Image source={SYSTEM_ICONS.location} style={[styles.rowIcon, { tintColor: COLORS.Secondary }]} />
              <TextInput
                style={[globalStyles.body, { flex: 1 }]}
                value={editedLocation}
                onChangeText={setEditedLocation}
                placeholder="Add location..."
                placeholderTextColor="rgba(0,0,0,0.3)"
              />
              {editedLocation.length > 0 && (
                <Pressable onPress={() => setEditedLocation('')} hitSlop={8}>
                  <Text style={styles.clearBtn}>✕</Text>
                </Pressable>
              )}
            </View>
          </ShadowBox>

          {/* ── song ── */}
          {editedSong && (
            <>
              <Text style={styles.sectionLabel}>SONG</Text>
              <View style={{ marginBottom: 12 }}>
                <SongCard song={editedSong} />
                <Pressable
                  onPress={() => setEditedSong(null)}
                  style={{ alignSelf: 'flex-end', marginTop: 6 }}
                >
                  <Text style={styles.removeText}>Remove song</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* ── lock ── */}
          <Text style={styles.sectionLabel}>PRIVACY</Text>
          <Pressable onPress={() => setEditedLock(prev => !prev)}>
            <ShadowBox
              contentBackgroundColor={editedLock ? PAGE.journal.border[0] + '33' : PAGE.journal.foreground[0]}
              shadowColor={PAGE.journal.border[0]}
              style={{ marginBottom: 12 }}
            >
              <View style={styles.row}>
                <Image
                  source={editedLock ? SYSTEM_ICONS.padlock : SYSTEM_ICONS.lock}
                  style={styles.rowIcon}
                />
                <Text style={globalStyles.body}>{editedLock ? 'Locked' : 'Unlocked'}</Text>
                <View style={[styles.toggle, { backgroundColor: editedLock ? PAGE.journal.border[0] : '#ccc' }]}>
                  <View style={[styles.toggleThumb, editedLock && styles.toggleThumbOn]} />
                </View>
              </View>
            </ShadowBox>
          </Pressable>

          {/* ── journal entry ── */}
          <Text style={styles.sectionLabel}>ENTRY</Text>
          <ShadowBox
            contentBackgroundColor="#fff"
            shadowColor={PAGE.journal.border[0]}
            style={{ marginBottom: 20 }}
          >
            <TextInput
              style={[journalStyle.textArea]}
              value={editedEntry}
              onChangeText={setEditedEntry}
              multiline
              placeholder="What's on your mind?"
              placeholderTextColor="rgba(0,0,0,0.3)"
              textAlignVertical="top"
            />
          </ShadowBox>

        </ScrollView>

        {/* save / cancel buttons */}
        <View style={styles.bottomBar}>
          <Pressable onPress={handleCancelEdit} style={{ flex: 1 }}>
            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={14}>
              <View style={styles.bottomBtn}>
                <Text style={globalStyles.body}>Cancel</Text>
              </View>
            </ShadowBox>
          </Pressable>

          <Pressable onPress={handleSave} style={{ flex: 1 }} disabled={isSaving}>
            <ShadowBox
              contentBackgroundColor={isSaving ? BUTTON_COLORS.Disabled : PAGE.journal.border[0]}
              shadowBorderRadius={14}
            >
              <View style={styles.bottomBtn}>
                {isSaving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={globalStyles.body}>Save</Text>
                }
              </View>
            </ShadowBox>
          </Pressable>
        </View>

        {/* mood picker modal */}
        <MoodPickerModal
          visible={showMoodPicker}
          selectedMood={editedMood as any}
          onClose={() => setShowMoodPicker(false)}
          onSelect={(mood) => {
            setEditedMood(mood);
            setShowMoodPicker(false);
          }}
        />
      </PageContainer>
    </AppLinearGradient>
  );
}

// ─── inline calendar ─────────────────────────────────────────────────────────

function InlineCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: Date;
  onSelect: (date: Date) => void;
}) {
  const [viewMonth, setViewMonth] = useState(new Date(selectedDate));

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isSelected = (day: number) =>
    selectedDate.getFullYear() === year &&
    selectedDate.getMonth() === month &&
    selectedDate.getDate() === day;

  const isToday = (day: number) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  return (
    <View>
      {/* header */}
      <View style={cal.header}>
        <Pressable
          onPress={() => setViewMonth(new Date(year, month - 1))}
          hitSlop={10}
        >
          <Image source={SYSTEM_ICONS.sortLeft} style={cal.navIcon} />
        </Pressable>
        <Text style={globalStyles.body}>{monthLabel}</Text>
        <Pressable
          onPress={() => setViewMonth(new Date(year, month + 1))}
          hitSlop={10}
        >
          <Image source={SYSTEM_ICONS.sortRight} style={cal.navIcon} />
        </Pressable>
      </View>

      {/* day labels */}
      <View style={cal.dayRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text key={i} style={cal.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* grid */}
      <View style={cal.grid}>
        {Array.from({ length: startDow }).map((_, i) => (
          <View key={`e-${i}`} style={cal.cell} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const sel = isSelected(day);
          const tod = isToday(day);
          return (
            <Pressable
              key={day}
              style={cal.cell}
              onPress={() => onSelect(new Date(year, month, day))}
            >
              <View
                style={[
                  cal.dayCircle,
                  sel && { backgroundColor: PAGE.journal.border[0] },
                  !sel && tod && { borderWidth: 1.5, borderColor: PAGE.journal.border[0] },
                ]}
              >
                <Text
                  style={[
                    cal.dayText,
                    sel && { color: '#fff', fontFamily: 'p2' },
                    !sel && tod && { color: PAGE.journal.border[0], fontFamily: 'p2' },
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

const cal = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navIcon: {
    width: 18,
    height: 18,
    opacity: 0.6,
  },
  dayRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'label',
    fontSize: 11,
    opacity: 0.45,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: 'p1',
    fontSize: 13,
    opacity: 0.8,
  },
});

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
    borderColor: 'rgba(0,0,0,0.12)',
  },
  moodDot: {
    width: 16,
    height: 16,
    borderRadius: 6,
    borderWidth: 1,
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
  sectionLabel: {
    fontFamily: 'label',
    fontSize: 11,
    opacity: 0.5,
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  rowIcon: {
    width: 18,
    height: 18,
    opacity: 0.7,
  },
  chevron: {
    width: 14,
    height: 14,
    marginLeft: 'auto',
    opacity: 0.4,
  },
  clearBtn: {
    fontSize: 14,
    opacity: 0.4,
    marginLeft: 'auto',
    paddingHorizontal: 4,
  },
  removeText: {
    fontFamily: 'label',
    fontSize: 12,
    color: BUTTON_COLORS.Delete,
    opacity: 0.8,
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    marginLeft: 'auto',
    justifyContent: 'center',
    padding: 2,
  },
  toggleThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
  toggleThumbOn: {
    alignSelf: 'flex-end',
  },
  timeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 20,
    left: 3,
    right: 3,
    flexDirection: 'row',
    gap: 10,
    zIndex: 5,
  },
  bottomBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});