import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef } from 'react';
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

export default function Paths() {
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
            <AppLinearGradient variant="path.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Paths" />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.path.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    // empty state
    // if (quests.length === 0) {
    //     return (
    //         <AppLinearGradient variant="assignments.background">
    //             <PageContainer showBottomNav>
    //                 <PageHeader title="Assignments" />
    //                 <EmptyStateView
    //                     icon={SYSTEM_ICONS.tag}
    //                     title="No courses yet"
    //                     description="Add a course? You can add assignments to your course also!"
    //                     buttonText="New Course"
    //                     buttonAction={() => router.push('/assignments/NewCourse')}
    //                     buttonColor={PAGE.assignments.primary[0]}
    //                 />
    //             </PageContainer>
    //         </AppLinearGradient>
    //     );
    // }

    return (
        <AppLinearGradient variant="path.background">
            <PageContainer showBottomNav>
                <PageHeader title="Paths" />

                <EmptyStateView
                    icon={SYSTEM_ICONS.path}
                    title="No paths yet"
                    description="Paths group your habits into a bigger goal — like a theme or chapter of your life you're actively working on."
                    buttonText="Create a path"
                    buttonAction={() => router.push('/(tabs)/paths/NewPath')}
                    buttonColor={PAGE.path.primary[0]}
                />


            </PageContainer>
        </AppLinearGradient>
    );
}