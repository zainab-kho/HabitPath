import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, Image } from 'react-native';

// hooks
import { useAssignmentActions } from '@/hooks/useAssignmentActions';
import { useAssignmentData } from '@/hooks/useAssignmentData';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

// constants
import { PAGE } from '@/constants/colors';
import ShadowBox from '@/ui/ShadowBox';
import { SYSTEM_ICONS } from '@/constants/icons';

export default function Profile() {
    const { user } = useAuth();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // data management
    const {
        loading,
        loadData,
        setDayPlanAssignments,
        setWeekPlans,
        setAssignments
    } = useAssignmentData(user?.id);

    // actions management
    const {
        handleAddWeek,
        toggleWeekCollapse,
        removeWeekPlan,
        handleAddAssignmentToDay,
        deleteFromTodayFocus,
        deleteFromWeekPlan,
        deleteAssignment,
        updateAssignmentStatus,
        handleSave,
        handleCancelEdit,
        isSaving
    } = useAssignmentActions({
        userId: user?.id,
        setDayPlanAssignments,
        setWeekPlans,
        setAssignments,
        loadData
    });

    // loading state
    if (loading) {
        return (
            <AppLinearGradient variant="profile.background">
                <PageContainer showBottomNav>
                    <PageHeader title="" />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.journal.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="profile.background">
            <PageContainer>
                <PageHeader title="" />


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