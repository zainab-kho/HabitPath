// @/app/(tabs)/more/countdown/index.tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// hooks
import { useAuth } from '@/contexts/AuthContext';
import { useCountdowns } from '@/hooks/useCountdowns';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';

// components
import { CountdownCard } from '@/components/countdown/CountdownCard';
import { Countdown } from '@/types/Countdown';

const NEW_COUNTDOWN_PATH = '/(tabs)/more/countdown/NewCountdown';

export default function CountdownPage() {
    const { user } = useAuth();
    const router = useRouter();

    // opened from the drawer: show a back button. otherwise show the bottom nav
    const { from } = useLocalSearchParams<{ from?: string }>();
    const fromDrawer = from === 'drawer';

    const { countdowns, loading, loadData } = useCountdowns(user?.id);

    // one clock shared by every card, so they all tick together
    const [now, setNow] = useState(() => new Date());

    // reload and start ticking when the page opens, stop ticking when it closes
    useFocusEffect(
        useCallback(() => {
            loadData();
            setNow(new Date());

            const interval = setInterval(() => setNow(new Date()), 1000);
            return () => clearInterval(interval);
        }, [loadData])
    );

    const openNewCountdown = () => router.push(NEW_COUNTDOWN_PATH);

    // the edit page is the new countdown page, prefilled with this countdown
    const openEditCountdown = (countdown: Countdown) =>
        router.push({
            pathname: NEW_COUNTDOWN_PATH,
            params: { editId: countdown.id, editData: JSON.stringify(countdown) },
        });

    const renderContent = () => {
        if (loading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={PAGE.countdown.primary[0]} />
                </View>
            );
        }

        if (countdowns.length === 0) {
            return (
                <EmptyStateView
                    icon={SYSTEM_ICONS.stopwatch}
                    title="No countdowns yet"
                    description="Count down to a trip, graduation, or anything you're excited for!"
                    buttonText="New Countdown"
                    buttonAction={openNewCountdown}
                    buttonColor={PAGE.countdown.primary[0]}
                />
            );
        }

        return (
            <>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    // room at the bottom so the last card can scroll clear of the add button
                    contentContainerStyle={{ paddingBottom: 80 }}
                >
                    {countdowns.map(countdown => (
                        <CountdownCard
                            key={countdown.id}
                            countdown={countdown}
                            now={now}
                            onPress={() => openEditCountdown(countdown)}
                        />
                    ))}
                </ScrollView>

                {/* floating add button */}
                <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
                    <Pressable onPress={openNewCountdown}>
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
            </>
        );
    };

    return (
        <AppLinearGradient variant="countdown.background">
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PageContainer showBottomNav={!fromDrawer}>
                    <PageHeader title="Countdown" showBackButton={fromDrawer} />
                    {renderContent()}
                </PageContainer>
            </GestureHandlerRootView>
        </AppLinearGradient>
    );
}
