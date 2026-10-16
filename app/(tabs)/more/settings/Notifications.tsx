// @/app/(tabs)/more/settings/Notifications.tsx
// The daily nudges: a morning start, a midday progress check and an evening
// tick-off. Each can be turned off or moved to a different time. These are
// device-local (AsyncStorage), separate from the per-habit reminders set on a habit.
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { COLORS } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import {
    DEFAULT_NUDGE_PREFS,
    ensureNotificationPermission,
    formatReminderTime,
    getNudgePrefs,
    NUDGE_SLOTS,
    NudgePrefs,
    NudgeSlot,
    resyncRemindersForUser,
    saveNudgePrefs,
} from '@/lib/notifications';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { pickerStyles, TimeWheel } from '@/ui/TimeWheel';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
const MERIDIEM = ['AM', 'PM'];

const NUDGE_LABELS: Record<NudgeSlot, { label: string; hint: string }> = {
    morning: { label: 'Morning nudge', hint: 'A good-morning push to start your day with a habit' },
    midday: { label: 'Midday progress', hint: 'How much of your day is done, and what is left' },
    evening: { label: 'Evening check-in', hint: 'A reminder to check off anything you did' },
};

// "HH:MM" (24h) <-> wheel values
const splitTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return {
        hour: String(h % 12 === 0 ? 12 : h % 12),
        minute: String(m).padStart(2, '0'),
        meridiem: h >= 12 ? 'PM' : 'AM',
    };
};

const joinTime = (hour: string, minute: string, meridiem: string) =>
    `${String((Number(hour) % 12) + (meridiem === 'PM' ? 12 : 0)).padStart(2, '0')}:${minute}`;

export default function NotificationSettings() {
    const { user } = useAuth();

    const [prefs, setPrefs] = useState<NudgePrefs>(DEFAULT_NUDGE_PREFS);
    // which row has its time wheel open — one at a time
    const [openSlot, setOpenSlot] = useState<NudgeSlot | null>(null);

    useEffect(() => {
        getNudgePrefs().then(setPrefs);
    }, []);

    const persist = async (next: NudgePrefs) => {
        setPrefs(next);
        await saveNudgePrefs(next);
        if (user) await resyncRemindersForUser(user.id);
    };

    const toggleNudge = async (slot: NudgeSlot, enabled: boolean) => {
        // turning one on is the moment to ask for notification permission
        if (enabled) {
            const granted = await ensureNotificationPermission();
            if (!granted) {
                Alert.alert(
                    'Notifications are off',
                    'Turn on notifications for HabitPath in your device settings to get these.'
                );
                return;
            }
        }

        if (!enabled && openSlot === slot) setOpenSlot(null);
        await persist({ ...prefs, [slot]: { ...prefs[slot], enabled } });
    };

    const setTime = (slot: NudgeSlot, time: string) => {
        persist({ ...prefs, [slot]: { ...prefs[slot], time } });
    };

    return (
        <AppLinearGradient variant="settings.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="Notifications" showBackButton />

                <ScrollView contentContainerStyle={{ paddingHorizontal: 30, paddingBottom: 70, gap: 20 }}>
                    <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6 }]}>
                        Daily nudges are skipped on days with nothing left to do.
                    </Text>

                    {NUDGE_SLOTS.map((slot) => {
                        const { enabled, time } = prefs[slot];
                        const parts = splitTime(time);
                        const isOpen = openSlot === slot;

                        return (
                            <View key={slot} style={{ gap: 10 }}>
                                <View style={styles.row}>
                                    <View style={{ flex: 1, paddingRight: 10 }}>
                                        <Text style={globalStyles.body}>{NUDGE_LABELS[slot].label}</Text>
                                        <Text style={[globalStyles.label, { opacity: 0.5 }]}>
                                            {NUDGE_LABELS[slot].hint}
                                        </Text>
                                    </View>
                                    <Switch
                                        trackColor={{ true: COLORS.RewardsAccent }}
                                        value={enabled}
                                        onValueChange={(value) => toggleNudge(slot, value)}
                                    />
                                </View>

                                {/* tap the time to open the wheel */}
                                {enabled && (
                                    <Pressable
                                        style={[globalStyles.bubbleLabel, { backgroundColor: COLORS.Time, alignSelf: 'flex-start' }]}
                                        onPress={() => setOpenSlot(isOpen ? null : slot)}
                                    >
                                        <Text style={globalStyles.body2}>{formatReminderTime(time)}</Text>
                                    </Pressable>
                                )}

                                {enabled && isOpen && (
                                    <View style={pickerStyles.container}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                            <TimeWheel
                                                data={HOURS}
                                                selected={parts.hour}
                                                onSelect={(value) => setTime(slot, joinTime(value, parts.minute, parts.meridiem))}
                                            />
                                            <TimeWheel
                                                data={MINUTES}
                                                selected={parts.minute}
                                                onSelect={(value) => setTime(slot, joinTime(parts.hour, value, parts.meridiem))}
                                            />
                                            <TimeWheel
                                                data={MERIDIEM}
                                                selected={parts.meridiem}
                                                onSelect={(value) => setTime(slot, joinTime(parts.hour, parts.minute, value))}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});
