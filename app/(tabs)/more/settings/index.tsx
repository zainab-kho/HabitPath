// @/app/tabs/more/settings/index.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BUTTON_COLORS, COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { buttonStyles, globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { TimeWheel, pickerStyles } from '@/ui/TimeWheel';
import { getResetTime } from '@/utils/habitUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';


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

            console.log(hour);
            console.log(minute);
        })();
    }, [user]);

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

    return (
        <AppLinearGradient variant="settings.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="Settings" showBackButton />

                <ScrollView contentContainerStyle={{ marginHorizontal: 30 }}>
                    <Text style={[globalStyles.h4, { textAlign: 'center', marginBottom: 30 }]}>
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
                        <View>
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

                            <Pressable
                                style={[
                                    buttonStyles.button,
                                    { backgroundColor: BUTTON_COLORS.Done, alignSelf: 'center', marginTop: 20 },
                                ]}
                                onPress={onDone}
                            >
                                <Text style={globalStyles.body}>Done</Text>
                            </Pressable>
                        </View>
                    )}

                    <Pressable
                        onPress={signOut}
                        style={[buttonStyles.button, { backgroundColor: COLORS.PrimaryLight, width: 150, alignSelf: 'center', margin: 100 }]}
                    >
                        <Text style={globalStyles.body}>Sign Out</Text>
                    </Pressable>
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}

const settingsStyle = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        alignItems: 'center',
    },
});