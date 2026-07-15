// @/app/(tabs)/quests/NewQuestPage.tsx
// Lean quest creation, styled like the other "New ___" pages: one white card with
// labelled fields and the standard Cancel / Save buttons.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { createQuest } from '@/lib/supabase/queries/quests';
import { globalStyles, uiStyles } from '@/styles';
import { QuestType } from '@/types/Quest';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { formatLocalDate } from '@/utils/dateUtils';

export default function NewQuestPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [name, setName] = useState('');
    const [type, setType] = useState<QuestType>('main');
    const [hasPhases, setHasPhases] = useState(false);
    const [endDateEnabled, setEndDateEnabled] = useState(false);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!user || !name.trim() || saving) return;
        setSaving(true);
        try {
            const quest = await createQuest(user.id, {
                name: name.trim(),
                type,
                hasPhases,
                endDate: endDate ? formatLocalDate(endDate) : null,
            });
            router.replace(`/(tabs)/quests/${quest.id}` as any);
        } catch (err) {
            console.error('Error creating quest:', err);
            setSaving(false);
        }
    };

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer>
                <PageHeader title="New Quest" showBackButton />

                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }} showsVerticalScrollIndicator={false}>
                    {/* main card — same outline as the other New pages */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderRadius: 20, padding: 30 }}>
                        {/* name */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>QUEST NAME</Text>
                        <TextInput
                            style={[uiStyles.inputField, { borderColor: PAGE.quest.primary[1], marginBottom: 20 }]}
                            placeholder="Get a software engineering job"
                            value={name}
                            onChangeText={setName}
                            cursorColor={PAGE.quest.primary[0]}
                            selectionColor={PAGE.quest.primary[0]}
                            autoFocus
                        />

                        {/* type — centered buttons (Cancel/Save width), left-aligned label */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>TYPE</Text>
                        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                            {(['main', 'side'] as QuestType[]).map(t => {
                                const sel = type === t;
                                return (
                                    <Pressable
                                        key={t}
                                        onPress={() => { setType(t); if (t === 'side') setHasPhases(false); }}
                                        style={{ flex: 1, maxWidth: 100 }}
                                    >
                                        <ShadowBox
                                            contentBackgroundColor={sel ? PAGE.quest.primary[0] : '#fff'}
                                            contentBorderColor={sel ? '#000' : PAGE.quest.primary[0]}
                                            shadowBorderColor={sel ? '#000' : PAGE.quest.primary[0]}
                                            shadowColor={sel ? '#000' : PAGE.quest.primary[0]}
                                        >
                                            <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                                <Text style={globalStyles.body}>{t === 'main' ? 'Main' : 'Side'}</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                );
                            })}
                        </View>

                        {/* phases — Main quests only; Side quests are a loose list */}
                        {type === 'main' && (
                            <>
                                <Text style={[globalStyles.label, { marginBottom: 10 }]}>PHASES</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={globalStyles.body}>Break into phases?</Text>
                                        <Text style={[globalStyles.body2, { fontSize: 12, opacity: 0.55, marginTop: 2 }]}>
                                            Ordered stages of habits & goals
                                        </Text>
                                    </View>
                                    <Switch
                                        value={hasPhases}
                                        onValueChange={setHasPhases}
                                        trackColor={{ true: PAGE.quest.primary[0], false: '#ccc' }}
                                    />
                                </View>
                            </>
                        )}

                        {/* end date — a question + toggle, revealing the date picker when on */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>END DATE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: endDateEnabled ? 12 : 0 }}>
                            <View style={{ flex: 1, paddingRight: 10 }}>
                                <Text style={globalStyles.body}>Create quest end date?</Text>
                            </View>
                            <Switch
                                value={endDateEnabled}
                                onValueChange={v => { setEndDateEnabled(v); if (!v) setEndDate(null); }}
                                trackColor={{ true: PAGE.quest.primary[0], false: '#ccc' }}
                            />
                        </View>
                        {endDateEnabled && (
                            <ShadowBox contentBackgroundColor="#fff" contentBorderRadius={16} shadowBorderRadius={16}>
                                <View style={{ padding: 12 }}>
                                    <SimpleCalendar
                                        selectedDate={endDate ?? undefined}
                                        onSelectDate={setEndDate}
                                        selectedDateColor={PAGE.quest.primary[0]}
                                        minDate={new Date()}
                                    />
                                </View>
                            </ShadowBox>
                        )}

                        {/* cancel / save — standard page button dimensions */}
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 30, justifyContent: 'center' }}>
                            <Pressable onPress={() => router.back()} style={{ flex: 1, maxWidth: 100 }}>
                                <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={20}>
                                    <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>Cancel</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            <Pressable
                                onPress={save}
                                disabled={!name.trim() || saving}
                                style={{ flex: 1, maxWidth: 100 }}
                            >
                                <ShadowBox
                                    contentBackgroundColor={(!name.trim() || saving) ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save}
                                    shadowBorderRadius={20}
                                >
                                    <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>{saving ? 'Saving...' : 'Save'}</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </View>
                    </View>
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}
