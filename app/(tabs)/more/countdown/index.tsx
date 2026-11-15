// @/app/(tabs)/more/countdown/index.tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// hooks
import { useCountdowns } from '@/hooks/useCountdowns';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import EmptyStateView from '@/ui/EmptyStateView';
import ShadowBox from '@/ui/ShadowBox';

// constants
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';

// components
import { CountdownCard } from '@/components/countdown/CountdownCard';
import { globalStyles } from '@/styles';

export default function CountdownPage() {
    const { user } = useAuth();
    const router = useRouter();
    // drawer access shows a back button; otherwise the bottom nav
    const { from } = useLocalSearchParams<{ from?: string }>();
    const fromDrawer = from === 'drawer';

    const { countdowns, loading, loadData } = useCountdowns(user?.id);

    // one shared clock for every card — only ticks while this page is on screen
    const [now, setNow] = useState(() => new Date());

    useFocusEffect(
        useCallback(() => {
            loadData();
            setNow(new Date());
            const interval = setInterval(() => setNow(new Date()), 1000);
            return () => clearInterval(interval);
        }, [loadData])
    );

    if (loading) {
        return (
            <AppLinearGradient variant="countdown.background">
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <PageContainer showBottomNav={!fromDrawer}>
                        <PageHeader title="Countdown" showBackButton={fromDrawer} />
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={PAGE.countdown.primary[0]} />
                        </View>
                    </PageContainer>
                </GestureHandlerRootView>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="countdown.background">
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PageContainer showBottomNav={!fromDrawer}>
                    <PageHeader title="Countdown" showBackButton={fromDrawer} />

                    {countdowns.length === 0 ? (
                        <EmptyStateView
                            icon={SYSTEM_ICONS.stopwatch}
                            title="No countdowns yet"
                            description="Count down to a trip, graduation, or anything you're excited for!"
                            buttonText="New Countdown"
                            buttonAction={() => router.push('/(tabs)/more/countdown/NewCountdown')}
                            buttonColor={PAGE.countdown.primary[0]}
                        />
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 80 }}
                        >
                            {countdowns.map(countdown => (
                                <CountdownCard
                                    key={countdown.id}
                                    countdown={countdown}
                                    now={now}
                                    onPress={() => router.push({
                                        pathname: '/(tabs)/more/countdown/NewCountdown',
                                        params: { editId: countdown.id, editData: JSON.stringify(countdown) },
                                    })}
                                />
                            ))}
                        </ScrollView>
                    )}

                    {/* add button — the empty state has its own */}
                    {countdowns.length > 0 && (
                    <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
                        <Pressable onPress={() => router.push('/(tabs)/more/countdown/NewCountdown')}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.countdown.primary[0]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                                shadowOffset={{ x: 1, y: 1 }}
                            >
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={SYSTEM_ICONS.plus} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                    )}
                </PageContainer>
            </GestureHandlerRootView>
        </AppLinearGradient>
    );
}
