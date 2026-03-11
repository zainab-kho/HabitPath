// @/app/tabs/more/settings/index.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { BUTTON_COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { globalStyles, uiStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { getResetTime } from '@/lib/supabase/queries';

export default function SettingsPage() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
    const MERIDIEM = ['AM', 'PM'];

    // set default reset time to 4:00AM
    const [hour, setHour] = useState('4');
    const [minute, setMinute] = useState('00');
    const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM');
    const [showTimePicker, setShowTimePicker] = useState(false);

    // pin settings
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);

    const handleVerify = async () => {
        setChecking(true);
        setErrorMsg(null);

        // Get the currently logged in user
        const { data: { user: currentUser } } = await supabase.auth.getUser();

        if (!currentUser) {
            setErrorMsg('Session expired. Please log in again.');
            setChecking(false);
            return;
        }

        // Verify the email matches the current user
        if (email.trim().toLowerCase() !== currentUser.email?.toLowerCase()) {
            setErrorMsg('Email or password is incorrect.');
            setChecking(false);
            return;
        }

        // Verify the password is correct for the current user
        const { data, error } = await supabase.rpc('verify_current_user_password', {
            password_input: password
        });

        setChecking(false);

        if (error || !data?.valid) {
            setErrorMsg('Email or password is incorrect.');
            return;
        }

        // Credentials are valid and match the current user
        router.replace('/more/settings/ResetPin');
    };

    // load saved time on mount
    useEffect(() => {
        (async () => {
            if (!user) return;

            const { hour, minute } = await getResetTime();

            // convert 24h to 12h for picker
            const isPM = hour >= 12;
            const hour12 =
                hour === 0 ? 12 :
                    hour > 12 ? hour - 12 :
                        hour;

            setHour(String(hour12));
            setMinute(String(minute).padStart(2, '0'));
            setMeridiem(isPM ? 'PM' : 'AM');
        })();
    }, [user]);

    const onDone = async () => {
        setShowTimePicker(false);


    };

    return (
        <AppLinearGradient variant="settings.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="Edit Pin" showBackButton />

                <View style={{
                    paddingHorizontal: 30,
                    gap: 20,
                    justifyContent: 'center',
                    alignSelf: 'center'
                }}>

                    <Text style={[globalStyles.h4, { textAlign: 'center' }]}>Please enter your email and password to reset your pin</Text>
                    <View style={{ gap: 20 }}>
                        <TextInput
                            style={uiStyles.inputField}
                            placeholder="Email"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            returnKeyType="next"
                        />

                        <TextInput
                            style={uiStyles.inputField}
                            placeholder="Password"
                            value={password}
                            onChangeText={setPassword}
                            autoCapitalize="none"
                            secureTextEntry
                            autoCorrect={false}
                            textContentType="password"
                            returnKeyType="done"
                        />

                        <ShadowBox
                            contentBackgroundColor={checking ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Edit}
                            contentBorderRadius={20}
                            shadowBorderRadius={20}
                        >
                            <Pressable
                                onPress={handleVerify}
                                disabled={checking || !email.trim() || !password}
                                style={{ paddingVertical: 6, paddingHorizontal: 15, alignItems: 'center', opacity: (checking || !email.trim() || !password) ? 0.6 : 1 }}
                            >
                                <Text style={globalStyles.body}>{checking ? 'Checking...' : 'Continue'}</Text>
                            </Pressable>
                        </ShadowBox>

                        {!!errorMsg && <Text style={[globalStyles.body, { color: BUTTON_COLORS.Delete, textAlign: 'center' }]}>{errorMsg}</Text>}

                    </View>
                </View>
            </PageContainer>
        </AppLinearGradient >
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