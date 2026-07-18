// @/app/(tabs)/more/settings/Credentials.tsx
// App credits: who made it, and attribution for third-party assets.
// The Icons8 link is REQUIRED by their free license (a visible, clickable link
// wherever the icons are used) — do not remove it while the app uses their icons.
import React from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';

import { BUTTON_COLORS } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

export default function CredentialsPage() {
    return (
        <AppLinearGradient variant="settings.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="Credentials" showBackButton />

                <ScrollView contentContainerStyle={{ paddingHorizontal: 30, gap: 20 }}>
                    <Text style={[globalStyles.h4, { textAlign: 'center' }]}>
                        About
                    </Text>

                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                        contentBackgroundColor="#fff"
                    >
                        <View style={{ paddingVertical: 16, paddingHorizontal: 15, alignItems: 'center', gap: 6 }}>
                            <Text style={globalStyles.body}>HabitPath</Text>
                            <Text style={globalStyles.body2}>By Zainab Khoshnaw</Text>
                        </View>
                    </ShadowBox>

                    <Text style={[globalStyles.h4, { textAlign: 'center', marginTop: 10 }]}>
                        Credits
                    </Text>

                    {/* Icons8 attribution — required by their free license */}
                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                    >
                        <Pressable
                            onPress={() => Linking.openURL('https://icons8.com')}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center' }}
                        >
                            <Text style={globalStyles.body1}>Icons by Icons8</Text>
                        </Pressable>
                    </ShadowBox>
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}
