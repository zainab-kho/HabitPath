import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

// hooks
import { useAssignmentActions } from '@/hooks/useAssignmentActions';
import { useAssignmentData } from '@/hooks/useAssignmentData';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

// constants
import { PAGE } from '@/constants/colors';

export default function Profile() {
    const { user } = useAuth();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // data management
    const {
        courses,
        assignments,
        dayPlanAssignments,
        weekPlans,
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
            <PageContainer showBottomNav>
                <PageHeader title="" />


            </PageContainer>
        </AppLinearGradient>
    );
}