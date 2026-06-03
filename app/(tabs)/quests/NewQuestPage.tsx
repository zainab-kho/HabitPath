import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View, Text, TextInput, Pressable, Switch } from 'react-native';

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

export default function Quests() {
    const { user } = useAuth();
    const router = useRouter();
    const inputRef = useRef<TextInput>(null);
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [endQuestDate, setEndQuestDate] = useState<Date>(new Date());
    const [showCalendar, setShowCalendar] = useState(false);


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
                                value={showCalendar}
                                onValueChange={setShowCalendar}
                            />
                        </View>

                            { showCalendar && (
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
        </AppLinearGradient>
    );
}