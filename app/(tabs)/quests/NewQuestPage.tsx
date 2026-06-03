import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View, Text, TextInput, Pressable, Switch, Image } from 'react-native';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { globalStyles, uiStyles } from '@/styles';
import SimpleCalendar from '@/ui/SimpleCalendar';

// constants
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ShadowBox from '@/ui/ShadowBox';
import { getDateLabel } from '@/utils/dateUtils';

import { useQuestCreation } from '@/contexts/QuestCreationContext';

export default function NewQuestPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [endQuestDateToggle, setEndQuestDateToggle] = useState(false);
    const [endQuestDate, setEndQuestDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [phaseCountToggle, setPhaseCountToggle] = useState(false);

    const { phaseCount, phases, weekEndDay, setWeekEndDay, resetPhases } = useQuestCreation();

    if (loading) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Quests" />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.quest.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    const totalGoals = phases.reduce(
        (sum, p) => sum + p.goals.length + p.weeks.reduce((ws, w) => ws + w.goals.length, 0),
        0
    );

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer>
                <PageHeader title="Create Quest" showBackButton />

                <KeyboardAwareScrollView
                    enableOnAndroid={true}
                    contentContainerStyle={{
                        borderWidth: 1,
                        borderRadius: 20,
                        backgroundColor: '#fff'
                    }}
                >
                    <View style={{ padding: 20 }}>
                        {/* title */}
                        <Text style={[globalStyles.label, { marginBottom: 10 }]}>TITLE</Text>
                        <TextInput
                            style={[uiStyles.inputField, {
                                borderColor: PAGE.quest.primary[0],
                                marginBottom: 15,
                            }]}
                            placeholder='e.g. Get an Internship'
                            returnKeyType="next"
                            value={name}
                            onChangeText={setName}
                            cursorColor={PAGE.quest.primary[0]}
                            selectionColor={PAGE.quest.primary[0]}
                        />

                        {/* end date toggle */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}>
                            <Text style={globalStyles.body}>End date?</Text>
                            <Switch
                                trackColor={{ true: PAGE.habits.primary[1] }}
                                value={endQuestDateToggle}
                                onValueChange={(val) => {
                                    setEndQuestDateToggle(val);
                                    setShowCalendar(val);
                                }}
                            />
                        </View>

                        {endQuestDateToggle && (
                            <View style={{ marginBottom: 15, gap: 10, }}>
                                {endQuestDate && (
                                    <Pressable onPress={() => setShowCalendar(!showCalendar)}>
                                        <ShadowBox contentBackgroundColor="#fff" contentBorderRadius={10}>
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingVertical: 5,
                                                paddingHorizontal: 15,
                                            }}>
                                                <Image source={SYSTEM_ICONS.calendar} style={{ width: 17, height: 17 }} />
                                                <Text style={globalStyles.body1}>{getDateLabel(endQuestDate)}</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                )}

                                {showCalendar && (
                                    <View style={{ marginVertical: 5 }}>
                                        <ShadowBox>
                                            <SimpleCalendar
                                                selectedDate={endQuestDate}
                                                onSelectDate={(date) => {
                                                    setEndQuestDate(date);
                                                    setShowCalendar(false);
                                                }}
                                                selectedDateColor={PAGE.quest.primary[0]}
                                            />
                                        </ShadowBox>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* phases toggle */}
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                        }}>
                            <Text style={globalStyles.body}>Phases?</Text>
                            <Switch
                                trackColor={{ true: PAGE.habits.primary[1] }}
                                value={phaseCountToggle}
                                onValueChange={(val) => {
                                    setPhaseCountToggle(val);
                                    if (val) resetPhases();
                                }}
                            />
                        </View>

                        {phaseCountToggle && (
                            <View style={{ gap: 15 }}>
                                {/* week ends on */}
                                <View>
                                    <Text style={globalStyles.label}>WEEK ENDS ON</Text>
                                    <View style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        marginTop: 8,
                                    }}>
                                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                                            <Pressable key={i} onPress={() => setWeekEndDay(i)}>
                                                <ShadowBox
                                                    contentBackgroundColor={weekEndDay === i ? PAGE.quest.primary[0] : '#fff'}
                                                    shadowColor={PAGE.quest.primary[0]}
                                                >
                                                    <View style={{ width: 38, height: 25, justifyContent: 'center', alignItems: 'center' }}>
                                                        <Text style={[globalStyles.body2, { fontSize: 12 }]}>{day}</Text>
                                                    </View>
                                                </ShadowBox>
                                            </Pressable>
                                        ))}
                                    </View>
                                </View>

                                {/* edit phases button */}
                                <Pressable onPress={() => router.push('/(tabs)/quests/EditPhases')}>
                                    <ShadowBox
                                        shadowColor={PAGE.quest.primary[0]}
                                        contentBackgroundColor="#fff"
                                    >
                                        <View style={{ paddingVertical: 10, paddingHorizontal: 15 }}>
                                            <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                                Edit Phases
                                            </Text>
                                            <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.5, marginTop: 2 }]}>
                                                {phaseCount} {phaseCount === 1 ? 'phase' : 'phases'} · {totalGoals} {totalGoals === 1 ? 'goal' : 'goals'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={PAGE.assignments.background[1]} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Save} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {saving ? 'Saving...' : 'Save'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </KeyboardAwareScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}
