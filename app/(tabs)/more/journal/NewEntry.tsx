import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
// RN's ScrollView doesn't scroll inside these modals — use gesture-handler's
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { markJournalEntrySynced } from '@/lib/journal/offlineSync';
import { getCache, setCache } from '@/lib/journal/journalCacheStore';
import { encryptEntryFields, getJournalKey } from '@/lib/journal/entryCrypto';
import { JournalEntry } from '@/types/JournalEntry';
import { COLORS, PAGE } from '@/constants/colors';
import MoodPickerModal from '@/modals/MoodPickerModal';
import SongPickerModal, { SongData } from '@/modals/SongPickerModal';
import SongCard from '@/components/journal/SongCard';
import { formatDisplayDate, formatDisplayTime, formatLocalDate } from '@/utils/dateUtils';
import { MAIN_MOOD_COLORS, MOOD_COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';

import { globalStyles, journalStyle } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel, pickerStyles } from '@/ui/TimeWheel';
import ToggleRow from '@/ui/ToggleRow';
import { BUTTON_COLORS } from '@/constants/colors';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];


export default function JournalPage() {
    const router = useRouter();
    const { user } = useAuth();
    // the entry's date + time — defaults to now, editable via the pill at the top
    const [entryDateTime, setEntryDateTime] = useState<Date>(() => new Date());
    const localDate = formatDisplayDate(entryDateTime);
    const localTime = formatDisplayTime(entryDateTime);

    // date/time picker modal state (temp values until Save)
    const [dateTimeModalOpen, setDateTimeModalOpen] = useState(false);
    const [tempDate, setTempDate] = useState<Date>(() => new Date());
    const [tempHour, setTempHour] = useState('12');
    const [tempMinute, setTempMinute] = useState('00');
    const [tempMeridiem, setTempMeridiem] = useState<'AM' | 'PM'>('AM');
    const [selectedMood, setSelectedMood] =
        useState<keyof typeof MOOD_COLORS | null>(null);
    const [lock, setLock] = useState(false);
    const [entry, setEntry] = useState('');
    const [location, setLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [moodModalOpen, setMoodModalOpen] = useState(false);
    const [extraMood, setExtraMood] =
        useState<keyof typeof MOOD_COLORS | null>(null);
    const [song, setSong] = useState<SongData | null>(null);
    const [book, setBook] = useState<SongData | null>(null);
    const [show, setShow] = useState<SongData | null>(null);
    // which media picker is open (they share one modal)
    const [mediaPicker, setMediaPicker] = useState<'song' | 'book' | 'show' | null>(null);

    const locationRef = useRef<TextInput>(null);
    const inputRef = useRef<TextInput>(null);


    // autofocus for quick logging
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // base 5 main moods
    const BASE_MOODS = Object.keys(MAIN_MOOD_COLORS) as (keyof typeof MAIN_MOOD_COLORS)[];

    // visual display: first 4 main moods + (extraMood OR 5th main mood)
    const displayedMoods: (keyof typeof MOOD_COLORS)[] = extraMood
        ? [BASE_MOODS[0], BASE_MOODS[1], extraMood, BASE_MOODS[3], BASE_MOODS[4]]
        : BASE_MOODS;

    const handleMoodPress = (mood: keyof typeof MOOD_COLORS) => {
        if (selectedMood === mood) {
            setSelectedMood(null);
            return;
        }
        setSelectedMood(mood);
    };

    const handleMoodModalSelect = (mood: keyof typeof MOOD_COLORS) => {
        setSelectedMood(mood);
        setMoodModalOpen(false);

        if (BASE_MOODS.includes(mood as keyof typeof MAIN_MOOD_COLORS)) {
            setExtraMood(null);
        } else {
            setExtraMood(mood);
        }
    };


    // open the picker prefilled with the entry's current date + time
    const openDateTimeModal = () => {
        setTempDate(entryDateTime);
        const hours = entryDateTime.getHours();
        const isPM = hours >= 12;
        const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
        setTempHour(String(hour12));
        setTempMinute(String(entryDateTime.getMinutes()).padStart(2, '0'));
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
        setEntryDateTime(combined);
        setDateTimeModalOpen(false);
    };

    const handleSave = async () => {
        if (!selectedMood && !location && !entry && !song && !book && !show) {
            console.log('Nothing to save!');
            return;
        }

        if (!user) {
            Alert.alert('Error', 'You must be logged in to save entries');
            return;
        }

        setIsSaving(true);

        try {
            const now = new Date();
            const id = now.toISOString();
            // the entry is filed under the user-picked date + time, not save time
            const localDateString = formatLocalDate(entryDateTime);

            const newEntry: JournalEntry = {
                id,
                date: entryDateTime,
                time: localTime,
                mood: selectedMood || undefined,
                location: location || undefined,
                entry: entry || undefined,
                song: song || undefined,
                book: book || undefined,
                show: show || undefined,
            };

            // save to AsyncStorage — flagged pendingSync until it reaches Supabase.
            // lock + created_at are cached too so an offline entry can be synced
            // later with its full state intact.
            const cacheEntry = {
                ...newEntry,
                date: localDateString,
                lock,
                created_at: now.toISOString(),
                pendingSync: true,
            };
            const allEntries: any[] = await getCache(user.id);
            allEntries.push(cacheEntry);
            await setCache(user.id, allEntries);

            console.log('**LOG: Entry saved to AsyncStorage (cache)');

            // encrypt the sensitive fields before they leave the device (no-op if
            // the user hasn't turned on encryption — then they save as plaintext)
            const key = await getJournalKey(user.id);
            const enc = encryptEntryFields({ entry: entry || null, mood: selectedMood ?? null }, key);

            // save to Supabase WITH LOCK STATUS
            const { data, error } = await supabase
                .from('journal_entries')
                .insert([
                    {
                        id: id,
                        user_id: user.id,
                        date: localDateString,
                        time: localTime,
                        mood: enc.mood,
                        location: location || null,
                        entry: enc.entry,
                        is_locked: lock,
                        song: song || null,
                        book: book || null,
                        show: show || null,
                        created_at: now.toISOString(),
                    }
                ]);

            if (error) {
                console.error('**LOG: Supabase error:', error);
                Alert.alert(
                    'Saved Locally',
                    'Entry saved on your device. It will sync automatically next time you open your journal with a connection.'
                );
            } else {
                // reached the cloud — clear the pending flag so it isn't re-synced
                await markJournalEntrySynced(id, user.id);
                console.log('**LOG: Saved to Supabase (cloud)');
            }

            router.back();

        } catch (error) {
            console.error('Error saving journal entry:', error);
            Alert.alert('Error', 'Failed to save entry. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppLinearGradient variant="journal.background">
            <PageContainer>
                <PageHeader title="New Entry" showBackButton />

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
                        {localDate}  •  {localTime}
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
                        value={lock}
                        onValueChange={setLock}
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
                                                contentBackgroundColor={selectedMood === mood ? color : '#F9F8FF'}
                                                contentBorderColor={selectedMood === mood ? '#000' : color}
                                                contentBorderRadius={7}
                                                shadowColor={selectedMood === mood ? '#000' : color}
                                                shadowBorderColor={selectedMood === mood ? '#000' : color}
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
                            ref={locationRef}
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
                            value={location}
                            onChangeText={setLocation}
                            cursorColor={PAGE.journal.border[0]}
                            selectionColor={PAGE.journal.border[0]}
                        />
                    </View>

                    {/* journal */}
                    <Text style={[globalStyles.body, { marginBottom: 10 }]}>Journal</Text>

                    {/* media card previews above the text box */}
                    {song && (
                        <SongCard
                            song={song}
                            onRemove={() => setSong(null)}
                        />
                    )}
                    {book && (
                        <SongCard
                            song={book}
                            type="book"
                            onRemove={() => setBook(null)}
                        />
                    )}
                    {show && (
                        <SongCard
                            song={show}
                            type="show"
                            onRemove={() => setShow(null)}
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
                                value={entry}
                                onChangeText={setEntry}
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
                                    style={{ width: 14, height: 14, opacity: 0.4 }}
                                />
                                <Text style={{ fontFamily: 'p1', fontSize: 12, color: 'rgba(0,0,0,0.3)' }} numberOfLines={1}>
                                    {song ? song.title : 'add song'}
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
                                    {book ? book.title : 'add book'}
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
                                    {show ? show.title : 'add show'}
                                </Text>
                            </Pressable>

                            {/* **TODO: implement add images feature */}
                        </View>
                    </View>

                    {/* save — standard page button dimensions */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', margin: 20 }}>
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
            </PageContainer>

            <MoodPickerModal
                visible={moodModalOpen}
                selectedMood={selectedMood}
                onClose={() => setMoodModalOpen(false)}
                onSelect={handleMoodModalSelect}
            />

            <SongPickerModal
                visible={mediaPicker !== null}
                mediaType={mediaPicker ?? 'song'}
                onClose={() => setMediaPicker(null)}
                onSelect={(s) => {
                    // one media log at a time — picking a new type replaces the old one
                    setSong(mediaPicker === 'song' ? s : null);
                    setBook(mediaPicker === 'book' ? s : null);
                    setShow(mediaPicker === 'show' ? s : null);
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
        </AppLinearGradient>
    );
}

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