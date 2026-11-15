// @/app/(tabs)/more/countdown/NewCountdown.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { BUTTON_COLORS, PAGE, PRESET_COLORS } from '@/constants/colors';
import { DEFAULT_REMINDER_TIME, ensureNotificationPermission, formatReminderTime } from '@/lib/notifications';
import { createCountdown, deleteCountdown, updateCountdown } from '@/lib/supabase/queries/countdowns';
import ReminderModal from '@/modals/habits/ReminderModal';
import { globalStyles } from '@/styles';
import { NewItemStyles } from '@/styles/NewItemStyles';
import { Countdown } from '@/types/Countdown';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel, toggleMeridiem } from '@/ui/TimeWheel';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

export default function NewCountdown() {
    const { user } = useAuth();
    const router = useRouter();

    // edit mode: opened by tapping a countdown card, with its data prefilled
    const params = useLocalSearchParams<{ editId?: string; editData?: string }>();
    const isEditMode = !!params.editId;
    const editCountdown: Countdown | null = useMemo(
        () => (params.editData ? JSON.parse(params.editData) : null),
        [params.editData]
    );
    const editTarget = editCountdown ? new Date(editCountdown.targetAt) : null;

    const [title, setTitle] = useState(editCountdown?.title ?? '');
    // calendar day, kept at midnight local time
    const [date, setDate] = useState<Date>(() => {
        const d = editTarget ?? new Date();
        return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    });

    const [hasTime, setHasTime] = useState(editCountdown?.hasTime ?? false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [hour, setHour] = useState(() => {
        if (!editTarget || !editCountdown?.hasTime) return '12';
        const h = editTarget.getHours() % 12;
        return String(h === 0 ? 12 : h);
    });
    const [minute, setMinute] = useState(() => {
        if (!editTarget || !editCountdown?.hasTime) return '00';
        // snap to the 5-minute wheel
        return String(Math.floor(editTarget.getMinutes() / 5) * 5).padStart(2, '0');
    });
    const [meridiem, setMeridiem] = useState(() => {
        if (!editTarget || !editCountdown?.hasTime) return 'PM';
        return editTarget.getHours() >= 12 ? 'PM' : 'AM';
    });

    const [color, setColor] = useState<string>(editCountdown?.color ?? PRESET_COLORS[0]);
    const [showProgress, setShowProgress] = useState(editCountdown?.showProgress ?? true);

    // daily "X days left" notification
    const [remindMe, setRemindMe] = useState(editCountdown?.remindMe ?? false);
    const [reminderTime, setReminderTime] = useState(editCountdown?.reminderTime ?? DEFAULT_REMINDER_TIME);
    const [showReminderModal, setShowReminderModal] = useState(false);

    const [isSaving, setIsSaving] = useState(false);

    // date + optional time → the exact moment the countdown ends
    const buildTarget = (): Date => {
        const target = new Date(date);
        if (hasTime) {
            let h = Number(hour) % 12;
            if (meridiem === 'PM') h += 12;
            target.setHours(h, Number(minute), 0, 0);
        }
        return target;
    };

    const handleSave = async () => {
        if (!user) return;

        if (!title.trim()) {
            Alert.alert('Missing Info', 'Please enter a name for your countdown');
            return;
        }

        const target = buildTarget();
        if (target.getTime() <= Date.now()) {
            Alert.alert('Pick a future date', 'Countdowns need a date and time that haven\'t happened yet.');
            return;
        }

        const fields = { title: title.trim(), targetAt: target.toISOString(), hasTime, color, showProgress, remindMe, reminderTime };

        setIsSaving(true);
        try {
            if (isEditMode && params.editId) {
                await updateCountdown(params.editId, user.id, fields);
            } else {
                await createCountdown(user.id, fields);
            }
            router.back();
        } catch (err) {
            console.error('Error saving countdown:', err);
            Alert.alert('Error', 'Failed to save countdown');
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Countdown',
            'Are you sure you want to delete this countdown?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!params.editId || !user) return;
                        try {
                            await deleteCountdown(params.editId, user.id);
                            router.back();
                        } catch (err) {
                            console.error('Error deleting countdown:', err);
                            Alert.alert('Error', 'Failed to delete countdown');
                        }
                    },
                },
            ]
        );
    };

    return (
        <AppLinearGradient variant="countdown.background">
            <PageContainer>
                <PageHeader title={isEditMode ? 'Edit Countdown' : 'New Countdown'} showBackButton />
                {/* main card */}
                <View style={NewItemStyles.mainCardContainer}>
                    <ScrollView
                        contentContainerStyle={{ padding: 30, gap: 20 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* NAME */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 0 }]}>
                                COUNTDOWN NAME
                            </Text>
                            <TextInput
                                style={[
                                    globalStyles.body,
                                    {
                                        borderBottomWidth: 1,
                                        borderBottomColor: PAGE.countdown.primary[0],
                                        paddingVertical: 10,
                                    },
                                ]}
                                placeholder="e.g. Graduation"
                                placeholderTextColor="rgba(0,0,0,0.4)"
                                value={title}
                                onChangeText={setTitle}
                                cursorColor={PAGE.countdown.primary[1]}
                                selectionColor={PAGE.countdown.primary[1]}
                                returnKeyType="done"
                            />
                        </View>

                        {/* DATE */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                                DATE
                            </Text>
                            <View style={{ margin: 2 }}>
                                <ShadowBox>
                                    <SimpleCalendar
                                        selectedDate={date}
                                        onSelectDate={(d) => setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))}
                                        selectedDateColor={PAGE.countdown.primary[0]}
                                        minDate={new Date()}
                                    />
                                </ShadowBox>
                            </View>
                        </View>

                        {/* TIME (optional) — without it, counts down to the start of that day */}
                        <View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={globalStyles.body1}>Add a time?</Text>
                                <Switch
                                    value={hasTime}
                                    onValueChange={setHasTime}
                                    trackColor={{ false: '#ddd', true: PAGE.countdown.primary[0] }}
                                    thumbColor="#fff"
                                />
                            </View>

                            {hasTime && (
                                <View>
                                    <ShadowBox
                                        contentBackgroundColor={PAGE.countdown.background[0]}
                                        style={{ width: 120, alignSelf: 'center', marginBottom: 10 }}
                                    >
                                        <Pressable
                                            onPress={() => setShowTimePicker(prev => !prev)}
                                            style={{ paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' }}
                                        >
                                            <Text style={globalStyles.body}>
                                                {hour}:{minute} {meridiem}
                                            </Text>
                                        </Pressable>
                                    </ShadowBox>

                                    {showTimePicker && (
                                        <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 5 }}>
                                            <TimeWheel data={HOURS} selected={hour} wrapAfter="11" onSelect={(h, wraps) => { setHour(h); if (wraps % 2) setMeridiem(toggleMeridiem); }} />
                                            <Text style={{ fontSize: 24, alignSelf: 'center' }}>:</Text>
                                            <TimeWheel data={MINUTES} selected={minute} onSelect={setMinute} />
                                            <TimeWheel data={MERIDIEM} selected={meridiem} onSelect={setMeridiem} />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        {/* DAILY REMINDER — same flow as "Remind me" on a new habit */}
                        <View style={{ gap: 5 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={globalStyles.body1}>Daily reminder</Text>
                                    <Text style={[globalStyles.body2, { opacity: 0.6 }]}>
                                        A notification each day with how many days are left
                                    </Text>
                                </View>
                                <Switch
                                    value={remindMe}
                                    onValueChange={(val) => {
                                        if (val) {
                                            // pick the time first — the switch turns on when it's saved
                                            setShowReminderModal(true);
                                        } else {
                                            setRemindMe(false);
                                        }
                                    }}
                                    trackColor={{ false: '#ddd', true: PAGE.countdown.primary[0] }}
                                    thumbColor="#fff"
                                />
                            </View>

                            {/* tap the time to change it */}
                            {remindMe && (
                                <Pressable onPress={() => setShowReminderModal(true)} style={{ alignSelf: 'flex-start' }}>
                                    <Text style={[globalStyles.label, { opacity: 0.6 }]}>
                                        AT {formatReminderTime(reminderTime)}
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        {/* PROGRESS BAR toggle */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={globalStyles.body1}>Show progress bar</Text>
                                <Text style={[globalStyles.body2, { opacity: 0.6 }]}>
                                    Fills up from the day you {isEditMode ? 'created' : 'create'} this countdown
                                </Text>
                            </View>
                            <Switch
                                value={showProgress}
                                onValueChange={setShowProgress}
                                trackColor={{ false: '#ddd', true: PAGE.countdown.primary[0] }}
                                thumbColor="#fff"
                            />
                        </View>

                        {/* CARD COLOR — same picker as New Reward */}
                        <View style={{ gap: 10 }}>
                            <Text style={globalStyles.label}>CARD COLOR</Text>
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 10,
                                padding: 15,
                                backgroundColor: PAGE.countdown.background[1],
                                borderRadius: 15,
                            }}>
                                {PRESET_COLORS.map(preset => {
                                    const isSelected = color === preset;
                                    return (
                                        <ShadowBox
                                            key={preset}
                                            contentBackgroundColor={isSelected ? preset : '#fff'}
                                            contentBorderColor={isSelected ? '#000' : preset}
                                            contentBorderWidth={1}
                                            contentBorderRadius={18}
                                            shadowBorderColor={isSelected ? '#000' : preset}
                                            shadowColor={isSelected ? '#000' : preset}
                                            shadowBorderRadius={18}
                                        >
                                            <Pressable
                                                onPress={() => setColor(preset)}
                                                style={{ width: 25, height: 25 }}
                                            />
                                        </ShadowBox>
                                    );
                                })}
                            </View>
                        </View>
                    </ScrollView>

                    {/* cancel / (delete) / save — standard page button dimensions */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, backgroundColor: '#fff' }}>
                        <Pressable onPress={() => router.back()} style={{ flex: 1 }}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={15}>
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        {isEditMode && (
                            <Pressable onPress={handleDelete} style={{ flex: 1 }}>
                                <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={15}>
                                    <View style={{ paddingVertical: 6 }}>
                                        <Text style={[globalStyles.body, { textAlign: 'center' }]}>Delete</Text>
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        )}

                        <Pressable onPress={handleSave} style={{ flex: 1 }} disabled={isSaving}>
                            <ShadowBox
                                contentBackgroundColor={isSaving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </View>
            </PageContainer>

            <ReminderModal
                visible={showReminderModal}
                initialTime={reminderTime}
                accentColor={PAGE.countdown.primary[0]}
                subtitle={(t) => `${t} every day until ${title.trim() || 'your countdown'}`}
                onClose={() => setShowReminderModal(false)}
                onSave={async (time) => {
                    setReminderTime(time);
                    setRemindMe(true);
                    setShowReminderModal(false);

                    const granted = await ensureNotificationPermission();
                    if (!granted) {
                        Alert.alert(
                            'Notifications are off',
                            'Turn on notifications for HabitPath in your device settings to get this reminder.'
                        );
                    }
                }}
            />
        </AppLinearGradient>
    );
}
