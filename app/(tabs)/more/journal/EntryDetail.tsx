// @/app/(tabs)/more/journal/EntryDetail.tsx
import { BUTTON_COLORS, COLORS, MOOD_COLORS } from '@/components/colors';
import { SYSTEM_ICONS } from '@/components/icons';
import MoodPickerModal from '@/components/modals/MoodPickerModal';
import { JournalEntry } from '@/components/types/JournalEntry';
import { AppLinearGradient } from '@/components/ui/AppLinearGradient';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { buttonStyles } from '@/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function EntryDetail() {
    const router = useRouter();
    const { user } = useAuth();
    const { id } = useLocalSearchParams();
    const [entry, setEntry] = useState<JournalEntry | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [showMoodPicker, setShowMoodPicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // edit state
    const [editedDate, setEditedDate] = useState('');
    const [editedTime, setEditedTime] = useState('');
    const [editedLocation, setEditedLocation] = useState('');
    const [editedEntry, setEditedEntry] = useState('');
    const [editedMood, setEditedMood] = useState<keyof typeof MOOD_COLORS | null>(null);

    useEffect(() => {
        loadEntry();
    }, [id]);

    const loadEntry = async () => {
        try {
            // try AsyncStorage first
            const stored = await AsyncStorage.getItem('@journal_entries');
            const allEntries: JournalEntry[] = stored ? JSON.parse(stored) : [];
            let foundEntry = allEntries.find(e => e.id === id);

            if (foundEntry) {
                setEntry(foundEntry);
                setEditedDate(foundEntry.date.toString());
                setEditedTime(foundEntry.time || '');
                setEditedLocation(foundEntry.location || '');
                setEditedEntry(foundEntry.entry || '');
                setEditedMood(foundEntry.mood as keyof typeof MOOD_COLORS || null);
            }

            // sync with Supabase in background
            if (user) {
                const { data, error } = await supabase
                    .from('journal_entries')
                    .select('*')
                    .eq('id', id)
                    .eq('user_id', user.id)
                    .single();

                if (error) {
                    console.error('Supabase error:', error);
                    return;
                }

                if (data) {
                    const freshEntry: JournalEntry = {
                        id: data.id,
                        date: new Date(data.date),
                        time: data.time,
                        mood: data.mood as keyof typeof MOOD_COLORS | undefined,
                        location: data.location || undefined,
                        entry: data.entry || undefined,
                    };

                    setEntry(freshEntry);
                    setEditedDate(freshEntry.date.toString());
                    setEditedTime(freshEntry.time || '');
                    setEditedLocation(freshEntry.location || '');
                    setEditedEntry(freshEntry.entry || '');
                    setEditedMood(freshEntry.mood as keyof typeof MOOD_COLORS || null);
                }
            }
        } catch (error) {
            console.error('Error loading entry:', error);
        }
    };

    const handleSave = async () => {
        if (!entry) return;

        setIsSaving(true);

        try {
            // keep date as original Date object - don't let users change entry dates
            const updatedEntry: JournalEntry = {
                ...entry,
                date: entry.date, // keep original date
                time: editedTime,
                location: editedLocation,
                entry: editedEntry,
                mood: editedMood || undefined,
            };

            // update Supabase first so it's ready when home page loads
            if (user) {
                console.log('☁️ Updating Supabase first...');
                const { error } = await supabase
                    .from('journal_entries')
                    .update({
                        time: editedTime || null,
                        mood: editedMood || null,
                        location: editedLocation || null,
                        entry: editedEntry || null,
                    })
                    .eq('id', entry.id)
                    .eq('user_id', user.id);

                if (error) {
                    Alert.alert('Error', 'Failed to save to cloud. Please try again.');
                    return; // don't update cache if cloud fails
                }
            }

            // update AsyncStorage cache after Supabase succeeds
            const stored = await AsyncStorage.getItem('@journal_entries');
            const allEntries: JournalEntry[] = stored ? JSON.parse(stored) : [];
            const updatedEntries = allEntries.map(e =>
                e.id === entry.id ? updatedEntry : e
            );
            await AsyncStorage.setItem('@journal_entries', JSON.stringify(updatedEntries));

            // update local state
            setEntry(updatedEntry);
            setIsEditing(false);

        } catch (error) {
            console.error('Error saving entry:', error);
            Alert.alert('Error', 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Entry?',
            'This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // delete from AsyncStorage
                            const stored = await AsyncStorage.getItem('@journal_entries');
                            const allEntries: JournalEntry[] = stored ? JSON.parse(stored) : [];
                            const filtered = allEntries.filter(e => e.id !== id);
                            await AsyncStorage.setItem('@journal_entries', JSON.stringify(filtered));

                            // delete from Supabase
                            if (user) {
                                const { error } = await supabase
                                    .from('journal_entries')
                                    .delete()
                                    .eq('id', id)
                                    .eq('user_id', user.id);

                                if (error) {
                                    console.error('Supabase delete error:', error);
                                } else {
                                    console.log('**LOG: Deleted from Supabase');
                                }
                            }

                            router.back();
                        } catch (error) {
                            console.error('Error deleting entry:', error);
                            Alert.alert('Error', 'Failed to delete entry');
                        }
                    },
                },
            ]
        );
    };

    if (!entry) {
        return (
            <AppLinearGradient variant="journal.background">
                <PageContainer>
                    <PageHeader title="Loading..." showBackButton />
                </PageContainer>
            </AppLinearGradient>
        );
    }

    const bgColor = editedMood ? MOOD_COLORS[editedMood] : (entry.mood ? MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] : '#fff');
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    return (
        <AppLinearGradient variant="journal.background">
            <PageContainer>
                <PageHeader
                    title={isEditing ? "Edit Entry" : "Journal Entry"}
                    showBackButton
                />

                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    {!isEditing ? (
                        // view mode: scrollable page
                        <ScrollView 
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 30, }}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={[entryDetailStyle.card, { backgroundColor: bgColor }]}>
                                <Text style={entryDetailStyle.date}>{formattedDate}</Text>
                                {entry.time && <Text style={entryDetailStyle.time}>{entry.time}</Text>}
                                {entry.location && (
                                    <View style={{ flexDirection: 'row' }}>
                                        <Image
                                            source={SYSTEM_ICONS.location}
                                            style={{ width: 15, height: 15, tintColor: COLORS.Secondary, marginRight: 5, }}
                                        />
                                        <Text style={entryDetailStyle.location}>{entry.location}</Text>
                                    </View>
                                )}

                                {entry.mood && (
                                    <View style={entryDetailStyle.moodBadge}>
                                        <View
                                            style={[
                                                entryDetailStyle.moodDot,
                                                { backgroundColor: MOOD_COLORS[entry.mood as keyof typeof MOOD_COLORS] }
                                            ]}
                                        />
                                        <Text style={entryDetailStyle.moodText}>{entry.mood}</Text>
                                    </View>
                                )}
                                {entry.entry && <Text style={entryDetailStyle.entryText}>{entry.entry}</Text>}
                            </View>

                            {/* action button */}
                            <View style={{ width: 100, alignSelf: 'center', justifyContent: 'center', marginTop: 30, }}>
                                <Pressable
                                    style={buttonStyles.button}
                                    onPress={() => setIsEditing(true)}
                                >
                                    <Text style={buttonStyles.buttonText}>Edit</Text>
                                </Pressable>
                            </View>
                        </ScrollView>
                    ) : (
                        // edit mode: card fills space with internal scroll
                        <View style={{ marginHorizontal: 3, paddingBottom: 30, flex: 1 }}>
                            <View style={[entryDetailStyle.card, { backgroundColor: bgColor, flex: 1 }]}>
                                <ScrollView
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                                    <Text style={entryDetailStyle.label}>MOOD</Text>
                                    <Pressable
                                        style={entryDetailStyle.moodSelector}
                                        onPress={() => setShowMoodPicker(true)}
                                    >
                                        {editedMood ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                                <View style={[entryDetailStyle.moodDot, { backgroundColor: MOOD_COLORS[editedMood] }]} />
                                                <Text style={entryDetailStyle.moodSelectorText}>{editedMood}</Text>
                                            </View>
                                        ) : (
                                            <Text style={[entryDetailStyle.moodSelectorText, { color: '#999' }]}>Select a mood</Text>
                                        )}
                                    </Pressable>

                                    <Text style={entryDetailStyle.label}>TIME</Text>
                                    <TextInput
                                        style={entryDetailStyle.input}
                                        value={editedTime}
                                        onChangeText={setEditedTime}
                                        placeholder="e.g., 3:45 PM"
                                    />

                                    <Text style={entryDetailStyle.label}>LOCATION</Text>
                                    <TextInput
                                        style={entryDetailStyle.input}
                                        value={editedLocation}
                                        onChangeText={setEditedLocation}
                                        placeholder="Where were you?"
                                    />

                                    <Text style={entryDetailStyle.label}>ENTRY</Text>
                                    <TextInput
                                        style={[entryDetailStyle.input, entryDetailStyle.textArea]}
                                        value={editedEntry}
                                        onChangeText={setEditedEntry}
                                        placeholder="What happened today?"
                                        multiline
                                    />

                                    <Pressable
                                        style={[buttonStyles.button, { 
                                            alignSelf: 'center',
                                            marginTop: 20,
                                            width: 100,
                                            backgroundColor: BUTTON_COLORS.Delete,
                                             }]}
                                        onPress={handleDelete}
                                    >
                                        <Text style={buttonStyles.buttonText}>Delete</Text>
                                    </Pressable>
                                </ScrollView>
                            </View>

                            {/* action button fixed below card */}
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 30, justifyContent: 'center' }}>
                                <Pressable
                                    style={[buttonStyles.button, { width: 100, backgroundColor: '#ccc' }]}
                                    onPress={() => {
                                        setIsEditing(false);
                                        loadEntry();
                                    }}
                                >
                                    <Text style={buttonStyles.buttonText}>Cancel</Text>
                                </Pressable>
                                <Pressable
                                    style={[buttonStyles.button, { width: 100, backgroundColor: '#90BE6D', opacity: isSaving ? 0.6 : 1 }]}
                                    onPress={handleSave}
                                    disabled={isSaving}
                                >
                                    <Text style={buttonStyles.buttonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </KeyboardAvoidingView>

                {/* mood picker modal */}
                <MoodPickerModal
                    visible={showMoodPicker}
                    selectedMood={editedMood}
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

const entryDetailStyle = StyleSheet.create({
    card: {
        padding: 20,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
    },
    date: {
        fontFamily: 'p2',
        fontSize: 18,
        marginBottom: 8,
    },
    time: {
        fontFamily: 'label',
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    location: {
        fontFamily: 'label',
        fontSize: 14,
        fontStyle: 'italic',
        marginBottom: 10,
    },
    moodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 15,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 20,
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.2)',
    },
    moodDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#000',
    },
    moodText: {
        fontFamily: 'p1',
        fontSize: 13,
    },
    entryText: {
        fontFamily: 'p3',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    label: {
        fontFamily: 'label',
        fontSize: 11,
        color: '#666',
        marginTop: 15,
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 10,
        padding: 12,
        fontFamily: 'p3',
        fontSize: 14,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    textArea: {
        height: 290,
        textAlignVertical: 'top',
    },
    moodSelector: {
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 10,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.7)',
        minHeight: 45,
        justifyContent: 'center',
    },
    moodSelectorText: {
        fontFamily: 'p3',
        fontSize: 14,
    },
});