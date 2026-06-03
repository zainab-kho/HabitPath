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

export default function Quests() {
    const { user } = useAuth();
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [endQuestDateToggle, setEndQuestDateToggle] = useState(false);
    const [endQuestDate, setEndQuestDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);
    const [phaseCountToggle, setPhaseCountToggle] = useState(false);
    const [phaseCount, setPhaseCount] = useState(1);
    const [phases, setPhases] = useState<{ name: string }[]>([{ name: 'Phase 1' }]);
    const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);


    const updatePhaseCount = (newCount: number) => {
        if (newCount < 1) return;
        setPhaseCount(newCount);
        setPhases(prev => {
            if (newCount > prev.length) {
                const additions = Array.from({ length: newCount - prev.length }, (_, i) =>
                    ({ name: `Phase ${prev.length + i + 1}` })
                );
                return [...prev, ...additions];
            }
            return prev.slice(0, newCount);
        });
        if (currentPhaseIndex >= newCount) {
            setCurrentPhaseIndex(newCount - 1);
        }
    };

    const updatePhaseName = (index: number, name: string) => {
        setPhases(prev => prev.map((p, i) => i === index ? { ...p, name } : p));
    };

    // loading state
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

                    {/* main Create Quest section */}
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
                            <View style={{
                                marginBottom: 15
                            }}>
                                {endQuestDate && (
                                    <Pressable onPress={() => setShowCalendar(!showCalendar)}>
                                        <ShadowBox
                                            contentBackgroundColor="#fff"
                                            contentBorderRadius={10}
                                        >
                                            <View style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                gap: 10,
                                                paddingVertical: 5,
                                                paddingHorizontal: 15,
                                            }}>
                                                <Image
                                                    source={SYSTEM_ICONS.calendar}
                                                    style={{ width: 17, height: 17 }}
                                                />
                                                <Text style={globalStyles.body1}>
                                                    {getDateLabel(endQuestDate)}
                                                </Text>
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
                                    if (val) {
                                        setPhaseCount(1);
                                        setPhases([{ name: 'Phase 1' }]);
                                        setCurrentPhaseIndex(0);
                                    }
                                }}
                            />
                        </View>

                        {phaseCountToggle && (
                            <View style={{ gap: 20 }}>
                                {/* increment controls */}
                                <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                                    <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                        <Pressable
                                            onPress={() => updatePhaseCount(phaseCount - 1)}
                                            style={{
                                                paddingVertical: 3,
                                                paddingHorizontal: 8,
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                            <Text style={globalStyles.body}>-</Text>
                                        </Pressable>
                                    </ShadowBox>

                                    <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                        <View style={{
                                            paddingVertical: 2,
                                            borderColor: PAGE.quest.primary[0],
                                            width: 100,
                                            borderRadius: 20,
                                            justifyContent: 'center'
                                        }}>
                                            <TextInput
                                                style={[globalStyles.body, { textAlign: 'center' }]}
                                                keyboardType="numeric"
                                                value={phaseCount.toString()}
                                                onChangeText={text => {
                                                    const num = parseInt(text) || 1;
                                                    updatePhaseCount(Math.max(1, num));
                                                }}
                                            />
                                        </View>
                                    </ShadowBox>

                                    <ShadowBox shadowColor={PAGE.quest.primary[0]}>
                                        <Pressable
                                            onPress={() => updatePhaseCount(phaseCount + 1)}
                                            style={{
                                                paddingVertical: 3,
                                                paddingHorizontal: 8,
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}>
                                            <Text style={globalStyles.body}>+</Text>
                                        </Pressable>
                                    </ShadowBox>
                                </View>

                                {/* phase navigation + editor */}
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'stretch',
                                }}>
                                    {/* left arrow space (always reserved) */}
                                    <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                                        {currentPhaseIndex > 0 && (
                                            <Pressable onPress={() => setCurrentPhaseIndex(prev => prev - 1)}>
                                                <Image
                                                    source={SYSTEM_ICONS.sortLeft}
                                                    style={{ width: 22, height: 22 }}
                                                />
                                            </Pressable>
                                        )}
                                    </View>

                                    {/* phase card */}
                                    <View style={{
                                        flex: 1,
                                        borderWidth: 1,
                                        borderRadius: 20,
                                        backgroundColor: '#fff',
                                        padding: 20,
                                    }}>
                                        <Text style={[globalStyles.label, { marginBottom: 5, textAlign: 'center' }]}>
                                            PHASE {currentPhaseIndex + 1} OF {phaseCount}
                                        </Text>
                                        <TextInput
                                            style={[uiStyles.inputField, {
                                                borderColor: PAGE.quest.primary[0],
                                            }]}
                                            placeholder={`Phase ${currentPhaseIndex + 1} name`}
                                            returnKeyType="next"
                                            value={phases[currentPhaseIndex]?.name ?? ''}
                                            onChangeText={(text) => updatePhaseName(currentPhaseIndex, text)}
                                            cursorColor={PAGE.quest.primary[0]}
                                            selectionColor={PAGE.quest.primary[0]}
                                        />
                                    </View>

                                    {/* right arrow space (always reserved) */}
                                    <View style={{ width: 36, justifyContent: 'center', alignItems: 'center' }}>
                                        {currentPhaseIndex < phaseCount - 1 && (
                                            <Pressable onPress={() => setCurrentPhaseIndex(prev => prev + 1)}>
                                                <Image
                                                    source={SYSTEM_ICONS.sortRight}
                                                    style={{ width: 22, height: 22 }}
                                                />
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                    </View>

                    {/* action buttons */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                        <Pressable style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.assignments.background[1]}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            // onPress={handleSave}
                            style={{ flex: 1 }}
                        // **TODO:
                        // disabled={ .length === 0 || saving}
                        >
                            <ShadowBox
                                contentBackgroundColor={
                                    BUTTON_COLORS.Save
                                }
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {saving
                                            ? 'Saving...'
                                            : 'Save'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>





                </KeyboardAwareScrollView>





            </PageContainer>
        </AppLinearGradient >
    );
}