// @/app/(tabs)/quests/index.tsx
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useQuests } from '@/hooks/useQuests';
import { Quest } from '@/types/Quest';

import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { formatDisplayDate } from '@/utils/dateUtils';

export default function QuestsPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { quests, loading, loadData } = useQuests(user?.id);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const openNew = () => router.push('/(tabs)/quests/NewQuestPage' as any);

    if (loading) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Quests" />
                    <View style={styles.center}>
                        <ActivityIndicator size="small" color={PAGE.quest.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer showBottomNav>
                <PageHeader title="Quests" showPlusButton onPlusPress={openNew} />

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 65 }}
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                >
                    {quests.length === 0 ? (
                        <View style={{ marginTop: 40 }}>
                            <EmptyStateView
                                icon={SYSTEM_ICONS.quest}
                                title="No quests yet"
                                description="A quest is a big goal, optionally broken into phases of habits & tasks."
                                buttonText="Start a quest"
                                buttonAction={openNew}
                                buttonColor={PAGE.quest.primary[0]}
                            />
                        </View>
                    ) : (
                        quests.map(q => (
                            <QuestCard key={q.id} quest={q} onPress={() => router.push(`/(tabs)/quests/${q.id}` as any)} />
                        ))
                    )}
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}

function QuestCard({ quest, onPress }: { quest: Quest; onPress: () => void }) {
    const phaseCount = quest.phases?.length ?? 0;
    const done = !!quest.completedAt;
    return (
        <ShadowBox shadowOffset={{ x: 0, y: 3 }} shadowColor={PAGE.quest.primary[0]} style={styles.cardWrap}>
            <Pressable onPress={onPress} style={styles.card}>
                <View style={styles.cardTop}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{quest.name || 'Untitled quest'}</Text>
                    <View style={[styles.badge, { backgroundColor: quest.type === 'main' ? PAGE.quest.primary[0] : '#ddd' }]}>
                        <Text style={styles.badgeText}>{quest.type === 'main' ? 'Main' : 'Side'}</Text>
                    </View>
                </View>
                <View style={styles.metaRow}>
                    {quest.hasPhases && <Text style={styles.meta}>{phaseCount} {phaseCount === 1 ? 'phase' : 'phases'}</Text>}
                    {quest.endDate && <Text style={styles.meta}>· by {formatDisplayDate(new Date(quest.endDate))}</Text>}
                    {done && <Text style={[styles.meta, { color: '#54d697' }]}>· Completed</Text>}
                </View>
            </Pressable>
        </ShadowBox>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cardWrap: { marginBottom: 12 },
    card: { paddingVertical: 16, paddingHorizontal: 18, gap: 8 },
    cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
    cardTitle: { flex: 1, fontFamily: 'p1', fontSize: 17 },
    badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
    badgeText: { fontFamily: 'p2', fontSize: 12, color: '#000' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    meta: { fontFamily: 'p2', fontSize: 13, opacity: 0.7 },
});
