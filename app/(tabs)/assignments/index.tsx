// @/app/(tabs)/more/assignments/index.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

// hooks
import { useAssignmentActions } from '@/hooks/useAssignmentActions';
import { useAssignmentData } from '@/hooks/useAssignmentData';

// utils
import {
    shouldArchiveWeek as checkArchiveWeek,
    getDueAssignments,
    getThisWeekAssignments,
    getTodayAssignments,
    getUnplannedAssignments,
    getUpcomingAssignments
} from '@/utils/assignmentFilters';

// components
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import AssignmentTabs from '@/components/assignments/AssignmentTabs';
import { FloatingActions } from '@/components/assignments/FloatingActions';
import { StatusModal } from '@/components/assignments/StatusModal';
import { TodaysPlan } from '@/components/assignments/TodaysPlan';
import WeekPlanView from '@/components/assignments/WeekPlanView';

// modals
import AddAssignmentToDaySheet from '@/modals/AddAssignmentToDaySheet';
import AddWeekModal from '@/modals/AddWeekModal';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

// constants
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';

export default function Assignments() {
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

    // ui state
    const [activeTab, setActiveTab] = useState<'due' | 'thisWeek' | 'upcoming'>('due');
    const [showAddWeekModal, setShowAddWeekModal] = useState(false);
    const [showAssignmentSheet, setShowAssignmentSheet] = useState(false);
    const [selectedDayForSheet, setSelectedDayForSheet] = useState<{ date: string; label: string } | null>(null);
    const [showSaveButton, setShowSaveButton] = useState(false);
    const [showMoreButton, setShowMoreButton] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [selectedAssignmentForStatus, setSelectedAssignmentForStatus] = useState<AssignmentWithCourse | null>(null);

    // filtered Assignments
    const todayAssignments = getTodayAssignments(assignments, dayPlanAssignments);
    const dueAssignments = getDueAssignments(assignments);
    const thisWeekAssignments = getThisWeekAssignments(assignments);
    const upcomingAssignments = getUpcomingAssignments(assignments);
    const unplannedAssignments = getUnplannedAssignments(assignments, dayPlanAssignments);

    // handlers
    const handleEnterEditMode = () => {
        setShowMoreButton(false);
        setShowSaveButton(true);
        setShowMoreMenu(false);
        setEditMode(true);
    };

    const handleExitEditMode = async () => {
        await handleCancelEdit();
        setEditMode(false);
        setShowSaveButton(false);
        setShowMoreButton(true);
    };

    const handleSaveChanges = async () => {
        try {
            await handleSave();
            setEditMode(false);
            setShowSaveButton(false);
            setShowMoreButton(true);
        } catch (error) {
            // error already handled in handleSave
        }
    };

    const handleStatusUpdate = async (assignmentId: string, newStatus: string) => {
        try {
            await updateAssignmentStatus(assignmentId, newStatus);
            setShowStatusModal(false);
            setSelectedAssignmentForStatus(null);
        } catch (error) {
            // error already handled in updateAssignmentStatus
        }
    };

    const renderAssignmentCard = (assignment: AssignmentWithCourse, showDelete: boolean = false, onDelete?: () => void) => {
        return (
            <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                showDelete={showDelete}
                onDelete={onDelete}
                onStatusPress={() => {
                    setSelectedAssignmentForStatus(assignment);
                    setShowStatusModal(true);
                }}
            />
        );
    };

    // loading state
    if (loading) {
        return (
            <AppLinearGradient variant="assignments.background">
                <PageContainer>
                    <PageHeader title="Assignments" />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.assignments.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    // empty state
    if (courses.length === 0) {
        return (
            <AppLinearGradient variant="assignments.background">
                <PageContainer>
                    <PageHeader title="Assignments" />
                    <EmptyStateView
                        icon={SYSTEM_ICONS.tag}
                        title="No courses yet"
                        description="Add a course? You can add assignments to your course also!"
                        buttonText="New Course"
                        buttonAction={() => router.push('/assignments/NewCourse')}
                        buttonColor={PAGE.assignments.primary[0]}
                    />
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="assignments.background">
            <PageContainer>
                <PageHeader title="Assignments" />

                <ScrollView
                    ref={scrollViewRef}
                    style={{ flex: 1 }}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 40 }}
                >
                    {/* today's plan */}
                    <TodaysPlan
                        assignments={todayAssignments}
                        editMode={editMode}
                        onDelete={deleteFromTodayFocus}
                        onStatusPress={(assignment) => {
                            setSelectedAssignmentForStatus(assignment);
                            setShowStatusModal(true);
                        }}
                    />

                    {/* week plans */}
                    <WeekPlanView
                        weekPlans={weekPlans}
                        assignments={assignments}
                        dayPlanAssignments={dayPlanAssignments}
                        editMode={editMode}
                        onToggleCollapse={(id) => toggleWeekCollapse(id, weekPlans)}
                        onRemoveWeekPlan={(id) => removeWeekPlan(id, weekPlans)}
                        onDeleteFromWeekPlan={deleteFromWeekPlan}
                        onOpenAssignmentSheet={(date, label) => {
                            setSelectedDayForSheet({ date, label });
                            setShowAssignmentSheet(true);
                        }}
                        onOpenStatusModal={(assignment) => {
                            setSelectedAssignmentForStatus(assignment);
                            setShowStatusModal(true);
                        }}
                        shouldArchiveWeek={(weekPlan) => checkArchiveWeek(weekPlan, assignments)}
                    />

                    {/* Assignment Tabs */}
                    <AssignmentTabs
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        dueAssignments={dueAssignments}
                        thisWeekAssignments={thisWeekAssignments}
                        upcomingAssignments={upcomingAssignments}
                        todayAssignments={todayAssignments.length > 0}
                        renderAssignmentCard={renderAssignmentCard}
                        editMode={editMode}
                        onDeleteAssignment={deleteAssignment}
                        scrollViewRef={scrollViewRef}
                    />
                </ScrollView>

                {/* floating actions - renders both floating buttons and save buttons */}
                <FloatingActions
                    showSaveButton={showSaveButton}
                    showMoreMenu={showMoreMenu}
                    isSaving={isSaving}
                    onSave={handleSaveChanges}
                    onCancel={handleExitEditMode}
                    onToggleMenu={() => setShowMoreMenu(prev => !prev)}
                    onAddCourse={() => {
                        setShowMoreMenu(false);
                        router.push('/assignments/NewCourse');
                    }}
                    onAddWeek={() => {
                        setShowMoreMenu(false);
                        setShowAddWeekModal(true);
                    }}
                    onEdit={handleEnterEditMode}
                    onAddAssignment={() => router.push('/assignments/NewAssignment')}
                    onCloseMenu={() => setShowMoreMenu(false)}
                />

                {/* modals */}
                <StatusModal
                    visible={showStatusModal}
                    selectedAssignment={selectedAssignmentForStatus}
                    onClose={() => {
                        setShowStatusModal(false);
                        setSelectedAssignmentForStatus(null);
                    }}
                    onUpdateStatus={handleStatusUpdate}
                />

                <AddWeekModal
                    visible={showAddWeekModal}
                    weekPlans={weekPlans}
                    onClose={() => setShowAddWeekModal(false)}
                    onSave={handleAddWeek}
                />

                <AddAssignmentToDaySheet
                    visible={showAssignmentSheet}
                    onClose={() => {
                        setShowAssignmentSheet(false);
                        setSelectedDayForSheet(null);
                    }}
                    dayLabel={selectedDayForSheet?.label || ''}
                    targetDate={selectedDayForSheet?.date || ''}
                    availableAssignments={unplannedAssignments}
                    onAddAssignment={handleAddAssignmentToDay}
                />
            </PageContainer>
        </AppLinearGradient>
    );
}