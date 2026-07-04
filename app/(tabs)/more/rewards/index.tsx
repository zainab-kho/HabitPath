import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import ExchangeRateModal from '@/modals/rewards/ExchangeRateModal';
import PointsHistoryModal from '@/modals/rewards/PointsHistoryModal';
import RewardDetailModal from '@/modals/rewards/RewardDetailModal';
import { COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import {
    addRedeemedPoints,
    computeTotalPointsFromHabits,
    deleteReward,
    deleteRewardPhoto,
    getExchangeRate,
    getPointsResetDate,
    getRedeemedPoints,
    getRewards,
    saveExchangeRate,
    updateReward,
} from '@/services/rewards/rewards';
import { useAuth } from '@/contexts/AuthContext';
import { loadHabitsFromSupabase } from '@/lib/supabase/queries/habit';
import { Habit } from '@/types/Habit';
import { Reward } from '@/types/Reward';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import EmptyStateView from '@/ui/EmptyStateView';
import { lightenColor } from '@/utils';

export default function RewardsPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);

    const [totalEarnedAllTime, setTotalEarnedAllTime] = useState(0);
    const [redeemedPoints, setRedeemedPoints] = useState(0);
    const [pointsResetDate, setPointsResetDate] = useState<string | null>(null);
    const [availablePoints, setAvailablePoints] = useState(0);
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [habits, setHabits] = useState<Habit[]>([]);

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyType, setHistoryType] = useState<'available' | 'total' | 'redeemed'>('available');
    const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [showExchangeModal, setShowExchangeModal] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {

        // Check if exchange rate has been set; if not, prompt
        const rate = await getExchangeRate();
        if (rate === null) {
            setShowExchangeModal(true);
        }

        // Load habits from cache — used both for history display and computing total points
        // NOTE: "Total Earned" is always computed from habit completion history.
        // Clearing rewards does NOT change this number — only "Redeemed" resets to 0.
        let habitsArr: Habit[] = [];
        try {
            if (user) {
                habitsArr = await loadHabitsFromSupabase(user.id);
                setHabits(habitsArr);
            }
        } catch (e) {
            console.error('Error loading habits:', e);
        }

        // Load reset date and redeemed points from Supabase
        const redeemed = await getRedeemedPoints();
        setRedeemedPoints(redeemed);

        const resetDate = await getPointsResetDate();
        setPointsResetDate(resetDate);

        // Only count completions strictly after the reset date (pre-reset toggles don't affect balance)
        const totalEarned = computeTotalPointsFromHabits(habitsArr, resetDate ?? undefined);
        setTotalEarnedAllTime(totalEarned);

        // Available = totalEarned - redeemed
        const available = Math.max(0, totalEarned - redeemed);
        setAvailablePoints(available);

        // Load rewards from Supabase
        if (user) {
            const loadedRewards = await getRewards(user.id);
            setRewards(loadedRewards);
        }
        setLoading(false);
    };

    const handleExchangeRateSet = async (rate: number) => {
        await saveExchangeRate(rate);
        setShowExchangeModal(false);
    };

    const openHistory = (type: 'available' | 'total' | 'redeemed') => {
        setHistoryType(type);
        setShowHistoryModal(true);
    };

    const handleRedeem = async (reward: Reward) => {
        if (availablePoints < reward.costPoints) {
            Alert.alert(
                'Not Enough Points',
                `You need ${reward.costPoints - availablePoints} more points to redeem this reward.`
            );
            return;
        }

        Alert.alert(
            'Claim Your Reward?',
            `${reward.name}\n-${reward.costPoints} points\n\nNew balance: ${availablePoints - reward.costPoints} points${reward.recurring ? '\n\n↻ This reward will stay in your list for next time.' : ''}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Claim It!',
                    onPress: async () => {
                        try {
                            const claimedReward = {
                                ...reward,
                                // Recurring rewards stay unclaimed so they remain in the wishlist
                                isClaimed: reward.recurring ? false : true,
                                dateClaimed: new Date().toISOString().split('T')[0],
                            };
                            await updateReward(claimedReward, user!.id);
                            await addRedeemedPoints(reward.costPoints);
                            await loadData();
                            Alert.alert('Reward Claimed!', 'Go treat yourself! You earned it!');
                        } catch (err) {
                            console.error('Error redeeming reward:', err);
                            Alert.alert('Error', 'Failed to redeem reward. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleCardPress = (reward: Reward) => {
        setSelectedReward(reward);
        setShowDetailsModal(true);
    };

    const handleDeleteReward = async (id: string) => {
        try {
            const target = rewards.find(r => r.id === id);
            await deleteReward(id, user!.id);
            // best-effort: remove the stored photo too
            deleteRewardPhoto(target?.photoUri);
            setRewards(prev => prev.filter(r => r.id !== id));
        } catch (err) {
            Alert.alert('Error', 'Failed to delete reward.');
        }
    };

    const unclaimedRewards = rewards
        .filter(r => !r.isClaimed || r.recurring)
        .sort((a, b) => a.costDollars - b.costDollars);

    return (
        <AppLinearGradient variant="rewards.background">
            <PageContainer>
                <PageHeader title="My Rewards" showBackButton />

                <ExchangeRateModal
                    visible={showExchangeModal}
                    onComplete={handleExchangeRateSet}
                />

                <RewardDetailModal
                    visible={showDetailsModal}
                    onClose={() => setShowDetailsModal(false)}
                    reward={selectedReward}
                    onDelete={handleDeleteReward}
                />

                <PointsHistoryModal
                    visible={showHistoryModal}
                    onClose={() => setShowHistoryModal(false)}
                    type={historyType}
                    totalPoints={totalEarnedAllTime}
                    redeemedPoints={redeemedPoints}
                    rewards={rewards}
                    recentHabits={habits}
                    pointsResetDate={pointsResetDate}
                />

                <ScrollView contentContainerStyle={{ paddingBottom: 40, marginRight: 3, }} showsVerticalScrollIndicator={false}>
                    {loading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 150 }}>
                            <ActivityIndicator size="small" color={PAGE.rewards.primary[0]} />
                        </View>
                    ) : (
                        <View>
                            {/* points summary card */}
                            <ShadowBox shadowColor={PAGE.rewards.primary[0]}>
                                <View style={s.statsCard}>

                                    <Text style={[globalStyles.body, { marginBottom: 15, alignSelf: 'center' }]}>
                                        Points Summary
                                    </Text>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>

                                        {/* available */}
                                        <Pressable style={s.statItem} onPress={() => openHistory('available')}>
                                            <ShadowBox
                                                shadowBorderColor='#FFD581'
                                                shadowColor='#FFD581'
                                                contentBorderColor='#FFD581'
                                            >
                                                <View style={[s.statBadge]}>
                                                    <Image source={SYSTEM_ICONS.reward} style={{ width: 15, height: 15, tintColor: COLORS.Rewards }} />
                                                    <Text style={globalStyles.body}>{availablePoints}</Text>
                                                </View>
                                            </ShadowBox>

                                            <Text style={[globalStyles.label, { fontSize: 11 }]}>AVAILABLE</Text>
                                        </Pressable>

                                        {/* total */}
                                        <Pressable style={s.statItem} onPress={() => openHistory('total')}>
                                            <ShadowBox
                                                shadowBorderColor={COLORS.RewardsAccent}
                                                shadowColor={COLORS.RewardsAccent}
                                                contentBorderColor={COLORS.RewardsAccent}
                                            >
                                                <View style={[s.statBadge]}>
                                                    <Image source={SYSTEM_ICONS.reward} style={{ width: 15, height: 15, tintColor: COLORS.Rewards }} />
                                                    <Text style={globalStyles.body}>{totalEarnedAllTime}</Text>
                                                </View>
                                            </ShadowBox>
                                            <Text style={[globalStyles.label, { fontSize: 11 }]}>TOTAL</Text>
                                        </Pressable>

                                        {/* redeemed */}
                                        <Pressable style={s.statItem} onPress={() => openHistory('redeemed')}>
                                            <ShadowBox
                                                shadowBorderColor={COLORS.Rewards}
                                                shadowColor={COLORS.Rewards}
                                                contentBorderColor={COLORS.Rewards}
                                            >
                                                <View style={[s.statBadge]}>
                                                    <Image source={SYSTEM_ICONS.reward} style={{ width: 15, height: 15, tintColor: COLORS.Rewards }} />
                                                    <Text style={globalStyles.body}>{redeemedPoints}</Text>
                                                </View>
                                            </ShadowBox>
                                            <Text style={[globalStyles.label, { fontSize: 11 }]}>REDEEMED</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </ShadowBox>

                            {unclaimedRewards.length === 0 ? (
                                <EmptyStateView
                                    icon={SYSTEM_ICONS.gift}
                                    iconTintColor={COLORS.Rewards}
                                    title="No Items in Wishlist Yet!"
                                    description="Add things you'd like to reward yourself with after completing habits!"
                                    buttonText="Add Item"
                                    buttonAction={() => router.push('/(tabs)/more/rewards/NewRewardItem')}
                                    buttonColor={PAGE.rewards.primary[0]}
                                    containerStyle={{ marginTop: 30 }}
                                />
                            ) : (
                                <>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 15 }}>
                                <Text style={globalStyles.body}>My Wishlist ({unclaimedRewards.length})</Text>
                            </View>

                            <View style={{marginBottom: 50}}>
                                {/* 2-column grid */}
                                <View style={s.grid}>
                                    {unclaimedRewards.map(reward => {
                                        const canAfford = availablePoints >= reward.costPoints;
                                        const bgColor = reward.backgroundColor || '#FFF3D0';
                                        return (
                                            <View key={reward.id} style={s.gridItem}>
                                                <Pressable onPress={() => handleCardPress(reward)}>
                                                    <ShadowBox
                                                        contentBackgroundColor={bgColor}
                                                        contentBorderColor='#000'
                                                        shadowColor={PAGE.rewards.primary[0]}
                                                        contentBorderRadius={15}
                                                        shadowBorderRadius={15}
                                                    >
                                                        <View style={s.card}>
                                                            {/* Points badge */}
                                                            <View style={s.pointsBadge}>
                                                                <Image
                                                                    source={SYSTEM_ICONS.reward}
                                                                    style={{ width: 11, height: 11, tintColor: COLORS.Rewards }}
                                                                />
                                                                <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>
                                                                    {reward.costPoints} pts
                                                                </Text>
                                                            </View>

                                                            {/* Image area */}
                                                            <View style={s.imageContainer}>
                                                                {reward.photoUri ? (
                                                                    <Image source={{ uri: reward.photoUri }} style={s.cardImage} />
                                                                ) : (
                                                                    <View style={[s.cardImage, {
                                                                        justifyContent: 'center',
                                                                        alignItems: 'center',
                                                                        backgroundColor: lightenColor(bgColor, 0.15),
                                                                    }]}>
                                                                        <Image
                                                                            source={SYSTEM_ICONS.gift}
                                                                            style={{ width: 40, height: 40, tintColor: COLORS.Rewards }}
                                                                        />
                                                                    </View>
                                                                )}
                                                            </View>

                                                            {/* Name */}
                                                            <Text style={s.cardName} numberOfLines={1}>
                                                                {reward.name}
                                                            </Text>

                                                            {/* Tags */}
                                                            <View style={s.tagsContainer}>
                                                                {(reward.tags ?? []).slice(0, 2).map(tag => (
                                                                    <View key={tag} style={s.tag}>
                                                                        <Text style={{ fontSize: 8, fontFamily: 'label' }}>{tag}</Text>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        </View>
                                                    </ShadowBox>
                                                </Pressable>

                                                {/* Redeem button */}
                                                <Pressable
                                                    onPress={() => handleRedeem(reward)}
                                                    disabled={!canAfford}
                                                    style={{ marginTop: 8 }}
                                                >
                                                    <ShadowBox
                                                        contentBackgroundColor={canAfford ? PAGE.rewards.primary[1] : '#d1d6db'}
                                                        shadowColor={canAfford ? '#000' : '#aaa'}
                                                        contentBorderRadius={100}
                                                        shadowBorderRadius={100}
                                                    >
                                                        <View style={{ paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center' }}>
                                                            <Text style={[globalStyles.label, { fontSize: 11, opacity: 1, color: '#000' }]}>
                                                                {canAfford ? 'Redeem' : `Need ${reward.costPoints - availablePoints} more`}
                                                            </Text>
                                                        </View>
                                                    </ShadowBox>
                                                </Pressable>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                                </>
                            )}
                        </View>
                    )}


                </ScrollView>

                {/* floating button */}
                <View style={{ position: 'absolute', bottom: 50, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={() => router.push('/(tabs)/more/rewards/NewRewardItem' as any)}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.rewards.primary[0]}
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
                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}

const s = StyleSheet.create({
    statsCard: {
        padding: 20,
        marginBottom: 20,
    },
    statItem: {
        alignItems: 'center',
        gap: 10,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },

    gridItem: {
        width: '45%',     // key: stable 2 columns
        marginBottom: 15, // vertical spacing
    },
    card: {
        borderRadius: 15,
        padding: 12,
        alignItems: 'center',
        minHeight: 200,
    },
    imageContainer: {
        marginBottom: 8,
    },
    cardImage: {
        width: 100,
        height: 100,
        borderColor: 'black',
        borderWidth: 1,
        borderRadius: 4,
    },
    cardName: {
        fontFamily: 'p2',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 5,
    },
    pointsBadge: {
        backgroundColor: 'rgba(255, 243, 220, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 213, 137, 0.8)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        alignSelf: 'center',
        marginBottom: 10,
    },
    tagsContainer: {
        flexDirection: 'row',
        gap: 3,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    tag: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 5,
        paddingVertical: 2,
        borderRadius: 8,
    },
});
