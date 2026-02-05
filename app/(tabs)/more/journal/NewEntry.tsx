import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View
} from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { JournalEntry } from '@/types/JournalEntry';

import { COLORS, PAGE } from '@/constants/colors';
import MoodPickerModal from '@/modals/MoodPickerModal';
import { buttonStyles, globalStyles, journalStyle } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ToggleRow from '@/ui/ToggleRow';
import { formatDisplayDate, formatDisplayTime, formatLocalDate } from '@/utils/dateUtils';

export const MAIN_MOOD_COLORS = {
    stressed: '#a81ba8ff',
    sad: '#4075e6ff',
    okay: '#ff9752',
    relaxed: '#6dddffff',
    happy: '#00AC8F',
};

export const MOOD_COLORS = {
    great: '#ff68f5ff',
    happy: '#00AC8F',
    excited: '#b66dffff',
    energetic: 'rgba(198, 222, 105, 1)',
    relaxed: '#6dddffff',
    okay: '#ff9752',
    sad: '#4075e6ff',
    stressed: '#a81ba8ff',
    anxious: '#548D8B',
    angry: '#ff3b3bff',
    frustrated: '#acacacff',
    sick: '#EEE8A9',
} as const;

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

    const locationRef = useRef<TextInput>(null);
    const inputRef = useRef<TextInput>(null);

    // base 5 main moods
    const BASE_MOODS = Object.keys(MAIN_MOOD_COLORS) as (keyof typeof MAIN_MOOD_COLORS)[];

    // visual display: first 4 main moods + (extraMood OR 5th main mood)
    const displayedMoods: (keyof typeof MOOD_COLORS)[] = extraMood
        ? [BASE_MOODS[0], BASE_MOODS[1], extraMood, BASE_MOODS[3], BASE_MOODS[4]]
        : BASE_MOODS;  // show all 5 main moods

    const handleMoodPress = (mood: keyof typeof MOOD_COLORS) => {
        // tap same mood again → unselect
        if (selectedMood === mood) {
            setSelectedMood(null);
            // don't reset extraMood - keep it visible
            return;
        }

        // select the mood
        setSelectedMood(mood);
    };

    const handleMoodModalSelect = (mood: keyof typeof MOOD_COLORS) => {
        setSelectedMood(mood);
        setMoodModalOpen(false);

        // if it's one of the base 5 moods, reset to normal
        if (BASE_MOODS.includes(mood as keyof typeof MAIN_MOOD_COLORS)) {
            setExtraMood(null);
        } else {
            // if it's an extra mood, replace
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
        if (!entry && !selectedMood && !location) {
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

            // format date in local timezone for storage
            const localDateString = formatLocalDate(now);

            const newEntry: JournalEntry = {
                id,
                date: now,
                time: localTime,
                mood: selectedMood || undefined,
                location: location || undefined,
                entry: entry || undefined,
            };

            // save to AsyncStorage
            const cacheEntry = {
                ...newEntry,
                date: localDateString, // store as YYYY-MM-DD string, not Date object
            };
            const existing = await AsyncStorage.getItem('@journal_entries');
            const allEntries: any[] = existing ? JSON.parse(existing) : [];
            allEntries.push(cacheEntry);
            await AsyncStorage.setItem('@journal_entries', JSON.stringify(allEntries));

            console.log('**LOG: Entry saved to AsyncStorage (cache)');

            // save to Supabase - use local date string (YYYY-MM-DD) to avoid timezone issues
            const { data, error } = await supabase
                .from('journal_entries')
                .insert([
                    {
                        id: id,
                        user_id: user.id,
                        date: localDateString, // YYYY-MM-DD format in local timezone
                        time: localTime,
                        mood: selectedMood,
                        location: location || null,
                        entry: entry || null,
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

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                        <ScrollView keyboardShouldPersistTaps="handled">
                            {/* lock entry */}
                            {/* <Text style={entryDetailStyle.label}>LOCK ENTRY?</Text> */}
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

                            <View style={journalStyle.journalCard}>
                                <TextInput
                                    ref={inputRef}
                                    style={[
                                        globalStyles.body,
                                        journalStyle.textArea,
                                        { lineHeight: 20 }
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
                        </ScrollView>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </PageContainer>

            <MoodPickerModal
                visible={moodModalOpen}
                selectedMood={selectedMood}
                onClose={() => setMoodModalOpen(false)}
                onSelect={handleMoodModalSelect}
            />
        </AppLinearGradient>
    );
}