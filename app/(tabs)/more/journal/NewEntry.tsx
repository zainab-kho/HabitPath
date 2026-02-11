import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Pressable,
    Text,
    TextInput,
    View,
    Image
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { JournalEntry } from '@/types/JournalEntry';
import { COLORS, PAGE } from '@/constants/colors';
import MoodPickerModal from '@/modals/MoodPickerModal';
import SongPickerModal, { SongData } from '@/modals/SongPickerModal';
import SongCard from '@/components/journal/SongCard';
import { formatDisplayDate, formatDisplayTime, formatLocalDate } from '@/utils/dateUtils';
import { MAIN_MOOD_COLORS, MOOD_COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';

import { buttonStyles, globalStyles, journalStyle } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ToggleRow from '@/ui/ToggleRow';


export default function JournalPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [localDate, setLocalDate] = useState('');
    const [localTime, setLocalTime] = useState('');
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
    const [songPickerOpen, setSongPickerOpen] = useState(false);

    const locationRef = useRef<TextInput>(null);
    const inputRef = useRef<TextInput>(null);

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

    useEffect(() => {
        const now = new Date();
        setLocalDate(formatDisplayDate(now));
        setLocalTime(formatDisplayTime(now));
        inputRef.current?.focus();
    }, []);

    const handleSave = async () => {
        if (!selectedMood && !location && !entry && !song) {
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
            const localDateString = formatLocalDate(now);

            const newEntry: JournalEntry = {
                id,
                date: now,
                time: localTime,
                mood: selectedMood || undefined,
                location: location || undefined,
                entry: entry || undefined,
                song: song || undefined,
            };

            // save to AsyncStorage
            const cacheEntry = {
                ...newEntry,
                date: localDateString,
            };
            const existing = await AsyncStorage.getItem('@journal_entries');
            const allEntries: any[] = existing ? JSON.parse(existing) : [];
            allEntries.push(cacheEntry);
            await AsyncStorage.setItem('@journal_entries', JSON.stringify(allEntries));

            console.log('**LOG: Entry saved to AsyncStorage (cache)');

            // save to Supabase WITH LOCK STATUS
            const { data, error } = await supabase
                .from('journal_entries')
                .insert([
                    {
                        id: id,
                        user_id: user.id,
                        date: localDateString,
                        time: localTime,
                        mood: selectedMood,
                        location: location || null,
                        entry: entry || null,
                        is_locked: lock,
                        song: song || null,
                        created_at: now.toISOString(),
                    }
                ]);

            if (error) {
                console.error('**LOG: Supabase error:', error);
                Alert.alert(
                    'Saved Locally',
                    'Entry saved on your device but failed to sync to cloud. Will retry when online.'
                );
            } else {
                console.log('**LOG: Saved to Supabase (cloud)');
            }

            console.log('**LOG: Journal entry saved:', newEntry);
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

                {/* date / time pill */}
                <Pressable
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
                    extraScrollHeight={20}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
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
                                        <Pressable
                                            onPress={() => handleMoodPress(mood)}
                                            style={[
                                                journalStyle.moodBox,
                                                { borderColor: color, shadowColor: color },
                                                selectedMood === mood && {
                                                    backgroundColor: color,
                                                    shadowColor: '#000',
                                                    borderColor: '#000',
                                                },
                                            ]}
                                        />
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

                    {/* song card preview above the text box */}
                    {song && (
                        <SongCard
                            song={song}
                            onRemove={() => setSong(null)}
                        />
                    )}

                    <View style={journalStyle.journalCard}>
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
                                onPress={() => setSongPickerOpen(true)}
                                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, flexDirection: 'row', alignItems: 'center', gap: 5 })}
                            >
                                <Image
                                    source={SYSTEM_ICONS.musicNote}
                                    style={{ width: 14, height: 14 }}
                                />
                                <Text style={{ fontFamily: 'p1', fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>
                                    {song ? song.title : 'add song'}
                                </Text>
                            </Pressable>

                            {/* **TODO: implement add images feature */}
                            {/* <Pressable
                                style={({ pressed }) => ({ opacity: pressed ? 0.4 : 1, flexDirection: 'row', alignItems: 'center', gap: 5 })}
                            >
                                <Text style={{ fontSize: 14 }}>🖼️</Text>
                                <Text style={{ fontFamily: 'p1', fontSize: 12, color: 'rgba(0,0,0,0.3)' }}>add image</Text>
                            </Pressable> */}
                        </View>
                    </View>

                    {/* save */}
                    <Pressable
                        style={[
                            buttonStyles.button,
                            {
                                alignSelf: 'center',
                                margin: 20,
                                backgroundColor: PAGE.journal.border[0],
                                opacity: isSaving ? 0.6 : 1,
                            },
                        ]}
                        onPress={handleSave}
                        disabled={isSaving}
                    >
                        <Text style={globalStyles.body}>
                            {isSaving ? 'Saving...' : 'Save'}
                        </Text>
                    </Pressable>
                </KeyboardAwareScrollView>
            </PageContainer>

            <MoodPickerModal
                visible={moodModalOpen}
                selectedMood={selectedMood}
                onClose={() => setMoodModalOpen(false)}
                onSelect={handleMoodModalSelect}
            />

            <SongPickerModal
                visible={songPickerOpen}
                onClose={() => setSongPickerOpen(false)}
                onSelect={(s) => setSong(s)}
            />
        </AppLinearGradient>
    );
}