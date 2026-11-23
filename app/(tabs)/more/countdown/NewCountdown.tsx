// @/app/(tabs)/more/countdown/NewCountdown.tsx
// the new countdown page. it doubles as the edit page when it's opened from a countdown card
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

// hooks
import { useAuth } from '@/contexts/AuthContext';

// data
import { DEFAULT_REMINDER_TIME, ensureNotificationPermission, formatReminderTime } from '@/lib/notifications';
import { createCountdown, deleteCountdown, updateCountdown } from '@/lib/supabase/queries/countdowns';
import { Countdown } from '@/types/Countdown';

// ui
import ReminderModal from '@/modals/habits/ReminderModal';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ColorPicker from '@/ui/ColorPicker';
import ShadowBox from '@/ui/ShadowBox';
import SimpleCalendar from '@/ui/SimpleCalendar';
import { TimeWheel, toggleMeridiem } from '@/ui/TimeWheel';

// constants + styles
import { BUTTON_COLORS, PAGE, PRESET_COLORS } from '@/colors';
import { globalStyles } from '@/styles';
import { NewItemStyles } from '@/styles/NewItemStyles';

// time wheel values. minutes go in steps of 5
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

const ACCENT = PAGE.countdown.primary[0];

// ─── helpers ─────────────────────────────────────────────────────────────────

// drops the time, leaving midnight at the start of that day
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

// a date's time as wheel values, with minutes rounded down to the nearest 5
function toWheelTime(date: Date) {
    const hour12 = date.getHours() % 12;
    return {
        hour: String(hour12 === 0 ? 12 : hour12),
        minute: String(Math.floor(date.getMinutes() / 5) * 5).padStart(2, '0'),
        meridiem: date.getHours() >= 12 ? 'PM' : 'AM',
    };
}

// wheel values back to a 24h hour (12 AM -> 0, 12 PM -> 12)
function toHour24(hour: string, meridiem: string) {
    return (Number(hour) % 12) + (meridiem === 'PM' ? 12 : 0);
}

// ─── small pieces ────────────────────────────────────────────────────────────

// a label on the left (with an optional line under it) and a switch on the right
function ToggleRow({ label, description, value, onValueChange }: {
    label: string;
    description?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
}) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
                <Text style={globalStyles.body1}>{label}</Text>
                {description && (
                    <Text style={[globalStyles.body2, { opacity: 0.6 }]}>{description}</Text>
                )}
            </View>
            <Switch
                value={value}
                onValueChange={onValueChange}
                trackColor={{ false: '#ddd', true: ACCENT }}
                thumbColor="#fff"
            />
        </View>
    );
}

// one of the buttons in the bar at the bottom of the card
function FooterButton({ label, color, onPress, disabled }: {
    label: string;
    color: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable onPress={onPress} disabled={disabled} style={{ flex: 1 }}>
            <ShadowBox contentBackgroundColor={color} shadowBorderRadius={15}>
                <View style={{ paddingVertical: 6 }}>
                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>{label}</Text>
                </View>
            </ShadowBox>
        </Pressable>
    );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function NewCountdown() {
    const { user } = useAuth();
    const router = useRouter();

    // edit mode: tapping a countdown card opens this page with that countdown passed along
    const params = useLocalSearchParams<{ editId?: string; editData?: string }>();
    const isEditMode = !!params.editId;
    const editCountdown: Countdown | null = useMemo(
        () => (params.editData ? JSON.parse(params.editData) : null),
        [params.editData]
    );

    // the time wheels start on the saved time when editing, or 12:00 PM otherwise
    const initialTime = useMemo(
        () => editCountdown?.hasTime
            ? toWheelTime(new Date(editCountdown.targetAt))
            : { hour: '12', minute: '00', meridiem: 'PM' },
        [editCountdown]
    );

    // name + date
    const [title, setTitle] = useState(editCountdown?.title ?? '');
    const [date, setDate] = useState(() =>
        startOfDay(editCountdown ? new Date(editCountdown.targetAt) : new Date())
    );

    // optional time of day
    const [hasTime, setHasTime] = useState(editCountdown?.hasTime ?? false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [hour, setHour] = useState(initialTime.hour);
    const [minute, setMinute] = useState(initialTime.minute);
    const [meridiem, setMeridiem] = useState(initialTime.meridiem);

    // daily "x days left" reminder
    const [remindMe, setRemindMe] = useState(editCountdown?.remindMe ?? false);
    const [reminderTime, setReminderTime] = useState(editCountdown?.reminderTime ?? DEFAULT_REMINDER_TIME);
    const [showReminderModal, setShowReminderModal] = useState(false);

    // how the card looks
    const [showProgress, setShowProgress] = useState(editCountdown?.showProgress ?? true);
    const [color, setColor] = useState<string>(editCountdown?.color ?? PRESET_COLORS[0]);

    const [isSaving, setIsSaving] = useState(false);

    // the exact moment the countdown ends: the picked day, plus the time if one was added.
    // with no time, it ends at midnight at the start of that day
    const buildTarget = (): Date => {
        const target = new Date(date);
        if (hasTime) target.setHours(toHour24(hour, meridiem), Number(minute), 0, 0);
        return target;
    };

    // ─── actions ─────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!user) return;

        if (!title.trim()) {
            Alert.alert('Missing Info', 'Please enter a name for your countdown');
            return;
        }

        const target = buildTarget();
        if (target.getTime() <= Date.now()) {
            Alert.alert('Pick a future date', "Countdowns need a date and time that haven't happened yet.");
            return;
        }

        const fields = {
            title: title.trim(),
            targetAt: target.toISOString(),
            hasTime,
            color,
            showProgress,
            remindMe,
            reminderTime,
        };

        setIsSaving(true);
        try {
            if (isEditMode && params.editId) {
                await updateCountdown(params.editId, user.id, fields);
            } else {
                await createCountdown(user.id, fields);
            }
            // the countdown page reloads when it comes back into focus,
            // which also updates the widget and the reminders
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

    // the reminder switch only turns on once a time has been picked in the modal
    const handleReminderToggle = (on: boolean) => {
        if (on) setShowReminderModal(true);
        else setRemindMe(false);
    };

    const handleReminderSave = async (time: string) => {
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
    };

    // rolling the hour wheel past 11 <-> 12 also flips AM / PM, like a real clock
    const handleHourSelect = (newHour: string, wraps: number) => {
        setHour(newHour);
        if (wraps % 2) setMeridiem(toggleMeridiem);
    };

    // ─── render ──────────────────────────────────────────────────────────────

    return (
        <AppLinearGradient variant="countdown.background">
            <PageContainer>
                <PageHeader title={isEditMode ? 'Edit Countdown' : 'New Countdown'} showBackButton />

                {/* main card: the fields scroll, the button bar stays pinned at the bottom */}
                <View style={NewItemStyles.mainCardContainer}>
                    <ScrollView
                        contentContainerStyle={{ padding: 30, gap: 20 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        {/* name */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 0 }]}>COUNTDOWN NAME</Text>
                            <TextInput
                                style={[
                                    globalStyles.body,
                                    { borderBottomWidth: 1, borderBottomColor: ACCENT, paddingVertical: 10 },
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

                        {/* date. past days can't be picked */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>DATE</Text>
                            <View style={{ margin: 2 }}>
                                <ShadowBox>
                                    <SimpleCalendar
                                        selectedDate={date}
                                        onSelectDate={(picked) => setDate(startOfDay(picked))}
                                        selectedDateColor={ACCENT}
                                        minDate={new Date()}
                                    />
                                </ShadowBox>
                            </View>
                        </View>

                        {/* optional time. tap the time to open or close the wheels */}
                        <View style={{ gap: 10 }}>
                            <ToggleRow label="Add a time?" value={hasTime} onValueChange={setHasTime} />

                            {hasTime && (
                                <ShadowBox
                                    contentBackgroundColor={PAGE.countdown.background[0]}
                                    style={{ width: 120, alignSelf: 'center' }}
                                >
                                    <Pressable
                                        onPress={() => setShowTimePicker(prev => !prev)}
                                        style={{ paddingVertical: 5, paddingHorizontal: 15, alignItems: 'center' }}
                                    >
                                        <Text style={globalStyles.body}>{hour}:{minute} {meridiem}</Text>
                                    </Pressable>
                                </ShadowBox>
                            )}

                            {hasTime && showTimePicker && (
                                <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 5 }}>
                                    <TimeWheel data={HOURS} selected={hour} wrapAfter="11" onSelect={handleHourSelect} />
                                    <Text style={{ fontSize: 24, alignSelf: 'center' }}>:</Text>
                                    <TimeWheel data={MINUTES} selected={minute} onSelect={setMinute} />
                                    <TimeWheel data={MERIDIEM} selected={meridiem} onSelect={setMeridiem} />
                                </View>
                            )}
                        </View>

                        {/* daily reminder. works the same way as "remind me" on a habit */}
                        <View style={{ gap: 5 }}>
                            <ToggleRow
                                label="Daily reminder"
                                description="A notification each day with how many days are left"
                                value={remindMe}
                                onValueChange={handleReminderToggle}
                            />

                            {/* tap the time to change it */}
                            {remindMe && (
                                <Pressable onPress={() => setShowReminderModal(true)} style={{ alignSelf: 'flex-start' }}>
                                    <Text style={[globalStyles.label, { opacity: 0.6 }]}>
                                        AT {formatReminderTime(reminderTime)}
                                    </Text>
                                </Pressable>
                            )}
                        </View>

                        {/* progress bar */}
                        <ToggleRow
                            label="Show progress bar"
                            description={`Fills up from the day you ${isEditMode ? 'created' : 'create'} this countdown`}
                            value={showProgress}
                            onValueChange={setShowProgress}
                        />

                        {/* card color. same picker as the new reward page */}
                        <View style={{ gap: 10 }}>
                            <Text style={globalStyles.label}>CARD COLOR</Text>
                            <ColorPicker
                                selected={color}
                                onSelect={setColor}
                                backgroundColor={PAGE.countdown.background[1]}
                            />
                        </View>
                    </ScrollView>

                    {/* cancel / delete (edit only) / save */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, backgroundColor: '#fff' }}>
                        <FooterButton label="Cancel" color={BUTTON_COLORS.Cancel} onPress={() => router.back()} />

                        {isEditMode && (
                            <FooterButton label="Delete" color={BUTTON_COLORS.Delete} onPress={handleDelete} />
                        )}

                        <FooterButton
                            label={isSaving ? 'Saving...' : 'Save'}
                            color={isSaving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save}
                            onPress={handleSave}
                            disabled={isSaving}
                        />
                    </View>
                </View>
            </PageContainer>

            <ReminderModal
                visible={showReminderModal}
                initialTime={reminderTime}
                accentColor={ACCENT}
                subtitle={(time) => `${time} every day until ${title.trim() || 'your countdown'}`}
                onClose={() => setShowReminderModal(false)}
                onSave={handleReminderSave}
            />
        </AppLinearGradient>
    );
}
