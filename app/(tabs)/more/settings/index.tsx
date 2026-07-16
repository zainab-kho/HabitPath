// @/app/tabs/more/settings/index.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { TimeWheel, pickerStyles } from '@/ui/TimeWheel';
import { getResetTime } from '@/lib/supabase/queries';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearWishlist, resetPointsBalance } from '@/services/rewards/rewards';
import { STORAGE_KEYS } from '@/storage/keys';
import { setWeekStartDay } from '@/utils/dateUtils';

const WEEK_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];


export default function SettingsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const { signOut } = useAuth()

    const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const MERIDIEM = ['AM', 'PM'];

    // set default reset time to 4:00AM
    const [hour, setHour] = useState('4');
    const [minute, setMinute] = useState('00');
    const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
    const [showTimePicker, setShowTimePicker] = useState(false);

    // which day the user's week starts on (weekly goals, week views, etc.)
    const [weekStartDay, setWeekStartDayState] = useState('Sunday');
    const [showWeekStartPicker, setShowWeekStartPicker] = useState(false);

    // load saved time on mount
    useEffect(() => {
        (async () => {
            if (!user) return;

            const { hour, minute } = await getResetTime();

            // convert 24h → 12h for picker
            const isPM = hour >= 12;
            const hour12 =
                hour === 0 ? 12 :
                    hour > 12 ? hour - 12 :
                        hour;

            setHour(String(hour12));
            setMinute(String(minute).padStart(2, '0'));
            setMeridiem(isPM ? 'PM' : 'AM');

            // week start day: local cache first, then supabase
            const cachedDay = await AsyncStorage.getItem(STORAGE_KEYS.USER_DAY_OF_WEEK_CHOICE);
            if (cachedDay) setWeekStartDayState(cachedDay);

            const { data } = await supabase
                .from('user_settings')
                .select('week_start_day')
                .eq('user_id', user.id)
                .single();
            if (data?.week_start_day) {
                setWeekStartDayState(data.week_start_day);
                setWeekStartDay(data.week_start_day); // apply to week calculations
                await AsyncStorage.setItem(STORAGE_KEYS.USER_DAY_OF_WEEK_CHOICE, data.week_start_day);
            }
        })();
    }, [user]);

    const onSelectWeekStart = async (day: string) => {
        setWeekStartDayState(day);
        setShowWeekStartPicker(false);
        // apply immediately to all week calculations
        setWeekStartDay(day);

        try {
            await AsyncStorage.setItem(STORAGE_KEYS.USER_DAY_OF_WEEK_CHOICE, day);

            if (user) {
                // include the reset-time fields so a first-time insert satisfies
                // the table's NOT NULL columns
                const { error } = await supabase
                    .from('user_settings')
                    .upsert({
                        user_id: user.id,
                        week_start_day: day,
                        end_of_day_hour: hour,
                        end_of_day_minute: minute,
                        end_of_day_meridiem: meridiem,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                if (error) console.error('Error saving week start day:', error);
            }
        } catch (err) {
            console.error('Unexpected error saving week start day:', err);
        }
    };

    const onDone = async () => {
        setShowTimePicker(false);

        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    end_of_day_hour: hour,
                    end_of_day_minute: minute,
                    end_of_day_meridiem: meridiem,
                    updated_at: new Date().toISOString(),
                })
                .select();

            if (error) {
                console.error('Error saving settings to Supabase:', error);
            } else {
                const hour24 =
                    meridiem === 'AM'
                        ? hour === '12' ? 0 : Number(hour)
                        : hour === '12' ? 12 : Number(hour) + 12;

                await AsyncStorage.setItem(
                    'resetTime',
                    JSON.stringify({
                        hour: hour24,
                        minute: Number(minute),
                    })
                );
            }
        } catch (err) {
            console.error('Unexpected error saving settings:', err);
        }
    };

    const handleResetPassword = () => {
        const email = user?.email;
        if (!email) {
            Alert.alert('Error', 'No email found for your account.');
            return;
        }

        Alert.alert(
            'Reset Password',
            `A password reset link will be sent to ${email}.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Link',
                    onPress: async () => {
                        try {
                            const { error } = await supabase.auth.resetPasswordForEmail(email);
                            if (error) throw error;
                            Alert.alert('Email Sent', 'Check your inbox for the password reset link.');
                        } catch (err) {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleClearWishlist = () => {
        Alert.alert(
            'Clear Wishlist',
            'This will permanently delete all items from your wishlist. Your points balance will not change. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear Wishlist',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;
                        try {
                            await clearWishlist(user.id);
                            Alert.alert('Done', 'Your wishlist has been cleared.');
                        } catch (err) {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleResetPointsBalance = () => {
        Alert.alert(
            'Reset Points Balance',
            'This will zero out your available points. Your habits and wishlist will not be affected. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Balance',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;
                        try {
                            // Convert picker state (12h) back to 24h for the reset calculation
                            const hour24 = meridiem === 'AM'
                                ? Number(hour) === 12 ? 0 : Number(hour)
                                : Number(hour) === 12 ? 12 : Number(hour) + 12;
                            await resetPointsBalance(hour24, Number(minute));
                            Alert.alert('Done', 'Your points balance has been reset to zero.');
                        } catch (err) {
                            Alert.alert('Error', 'Something went wrong. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <AppLinearGradient variant="settings.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="Settings" showBackButton />

                <ScrollView contentContainerStyle={{
                    paddingHorizontal: 30,
                    gap: 20,
                }}>
                    {/* <View style={{gap: 10}} */}
                    <Text style={[globalStyles.h4, { textAlign: 'center' }]}>
                        Preferences
                    </Text>

                    {/* time selection row */}
                    <View style={settingsStyle.row}>
                        <Text style={globalStyles.body}>End of day time</Text>

                        <Pressable
                            style={[globalStyles.bubbleLabel, { backgroundColor: COLORS.Time }]}
                            onPress={() => setShowTimePicker(prev => !prev)}
                        >
                            <Text style={globalStyles.body2}>{hour}:{minute} {meridiem}</Text>
                        </Pressable>
                    </View>

                    {showTimePicker && (
                        <View style={{ alignItems: 'center', gap: 10, }}>
                            <View style={pickerStyles.container}>
                                <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
                                    <TimeWheel data={HOURS} selected={hour} onSelect={setHour} />
                                    <TimeWheel data={MINUTES} selected={minute} onSelect={setMinute} />
                                    <TimeWheel
                                        data={MERIDIEM}
                                        selected={meridiem}
                                        onSelect={(value) => setMeridiem(value as 'AM' | 'PM')}
                                    />
                                </View>
                            </View>

                            <ShadowBox
                                shadowBorderRadius={20}
                                contentBackgroundColor={BUTTON_COLORS.Save}
                                style={{}}
                            >
                                <Pressable
                                    onPress={onDone}
                                    style={{
                                        alignItems: 'center',
                                        paddingVertical: 5,
                                        paddingHorizontal: 15
                                    }}
                                >
                                    <Text style={globalStyles.body1}>Done</Text>
                                </Pressable>
                            </ShadowBox>
                        </View>
                    )}

                    {/* week start day */}
                    <View style={settingsStyle.row}>
                        <Text style={globalStyles.body}>Week starts on</Text>

                        <Pressable
                            style={[globalStyles.bubbleLabel, { backgroundColor: COLORS.Time }]}
                            onPress={() => setShowWeekStartPicker(prev => !prev)}
                        >
                            <Text style={globalStyles.body2}>{weekStartDay}</Text>
                        </Pressable>
                    </View>

                    {showWeekStartPicker && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                            {WEEK_DAYS.map((day) => {
                                const isSelected = weekStartDay === day;
                                return (
                                    <Pressable key={day} onPress={() => onSelectWeekStart(day)}>
                                        <ShadowBox
                                            contentBackgroundColor={isSelected ? COLORS.Time : '#fff'}
                                            contentBorderColor={isSelected ? '#000' : COLORS.Time}
                                            shadowBorderColor={isSelected ? '#000' : COLORS.Time}
                                            shadowColor={isSelected ? '#000' : COLORS.Time}
                                        >
                                            <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                <Text style={globalStyles.body1}>{day.slice(0, 3)}</Text>
                                            </View>
                                        </ShadowBox>
                                    </Pressable>
                                );
                            })}
                        </View>
                    )}

                    {/* navigation bar customization */}
                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                        contentBackgroundColor={BUTTON_COLORS.Quiet}
                    >
                        <Pressable
                            onPress={() => router.push('/more/settings/NavBar')}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
                        >
                            <Text style={globalStyles.body1}>Customize Navigation bar</Text>
                        </Pressable>
                    </ShadowBox>

                    <Text style={[globalStyles.h4, { textAlign: 'center', marginTop: 10 }]}>
                        Data
                    </Text>

                    {/* clear wishlist */}
                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                        contentBackgroundColor={BUTTON_COLORS.Quiet}
                    >
                        <Pressable
                            onPress={handleClearWishlist}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
                        >
                            <Text style={globalStyles.body1}>Clear Wishlist</Text>
                        </Pressable>
                    </ShadowBox>

                    {/* reset points balance */}
                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                        contentBackgroundColor={BUTTON_COLORS.Quiet}
                    >
                        <Pressable
                            onPress={handleResetPointsBalance}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
                        >
                            <Text style={globalStyles.body1}>Reset Points Balance</Text>
                        </Pressable>
                    </ShadowBox>

                                        <Text style={[globalStyles.h4, { textAlign: 'center', marginTop: 10 }]}>
                        Security
                    </Text>

                    {/* edit pin */}
                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                        contentBackgroundColor={BUTTON_COLORS.Quiet}
                    >
                        <Pressable
                            onPress={() => router.push('/more/settings/EditPin')}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
                        >
                            <Text style={globalStyles.body1}>Edit Pin</Text>
                        </Pressable>
                    </ShadowBox>

                    {/* reset password */}
                    <ShadowBox contentBackgroundColor={BUTTON_COLORS.Quiet}>
                        <Pressable
                            onPress={handleResetPassword}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
                        >
                            <Text style={globalStyles.body1}>Reset Password</Text>
                        </Pressable>
                    </ShadowBox>
                </ScrollView>

                <ShadowBox
                    contentBackgroundColor={COLORS.Primary}
                    style={{ marginBottom: 100, marginHorizontal: 30 }}
                >
                    <Pressable
                        onPress={signOut}
                        style={{
                            alignItems: 'center',
                            paddingVertical: 5,
                            paddingHorizontal: 15
                        }}>
                        <Text style={globalStyles.body}>Sign Out</Text>
                    </Pressable>
                </ShadowBox>
            </PageContainer>
        </AppLinearGradient >
    );
}

const settingsStyle = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
});