import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

// hooks
import { useAssignmentActions } from '@/hooks/useAssignmentActions';
import { useAssignmentData } from '@/hooks/useAssignmentData';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

// constants
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';

export default function Quests() {
    const { user } = useAuth();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);
    const [loading, setLoading] = useState(false); 

    // loading state
    if (loading) {
        return (
            <AppLinearGradient variant="quest.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Quests" showPlusButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.quest.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    // empty state
    // if (quests.length === 0) {
    //     return (
    //         <AppLinearGradient variant="quest.background">
    //             <PageContainer showBottomNav>
    //                 <PageHeader title="Quests" />
    //                 <EmptyStateView
    //                     icon={SYSTEM_ICONS.quest}
    //                     title="No quests yet"
    //                     description="Quests help you work toward bigger goals using habits, tasks, and milestones, while earning points and tracking real progress."
    //                     buttonText="Start a quest"
    //                     buttonAction={() => router.push('/(tabs)/quests/NewQuestPage')}
    //                     buttonColor={PAGE.quest.primary[0]}
    //                 />
    //             </PageContainer>
    //         </AppLinearGradient>
    //     );
    // }

    return (
        <AppLinearGradient variant="quest.background">
            <PageContainer showBottomNav>
                <PageHeader title="Quests" showPlusButton/>

                <EmptyStateView
                    icon={SYSTEM_ICONS.quest}
                    title="No quests yet"
                    description="Quests help you work toward bigger goals using habits, tasks, and milestones, while earning points and tracking real progress."
                    buttonText="Start a quest"
                    buttonAction={() => router.push('/(tabs)/quests/NewQuestPage')}
                    buttonColor={PAGE.quest.primary[0]}
                />


            </PageContainer>
        </AppLinearGradient>
    );
}