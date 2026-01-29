// @/app/(tabs)/assignments/AllAssignments.tsx
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// hooks
import { useAssignmentData } from '@/hooks/useAssignmentData';

// components
import { AssignmentCard } from '@/components/assignments/AssignmentCard';
import EditAssignmentModal from '@/components/assignments/EditAssignmentModal';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { AssignmentWithCourse } from '@/hooks/useAssignmentData';
import { globalStyles } from '@/styles';
import { sortByDueDate } from '@/utils/dateUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH - 40;

export default function AllAssignments() {
    const { user } = useAuth();
    const router = useRouter();
    const scrollViewRef = useRef<ScrollView>(null);

    // data management
    const {
        courses,
        assignments,
        loading,
    } = useAssignmentData(user?.id);

    // ui state
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithCourse | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // filter and sort assignments
    const upcomingAssignments = sortByDueDate(
        assignments.filter(a => a.progress !== 'Done')
    );
    const pastAssignments = sortByDueDate(
        assignments.filter(a => a.progress === 'Done')
    );

    const handleTabPress = (tab: 'upcoming' | 'past') => {
        setActiveTab(tab);
        const tabIndex = tab === 'upcoming' ? 0 : 1;
        scrollViewRef.current?.scrollTo({ x: tabIndex * TAB_WIDTH, animated: true });
    };

    const handleAssignmentPress = (assignment: AssignmentWithCourse) => {
        setSelectedAssignment(assignment);
        setShowEditModal(true);
    };

    const renderAssignmentCard = (assignment: AssignmentWithCourse) => {
        return (
            <Pressable
                key={assignment.id}
                onPress={() => handleAssignmentPress(assignment)}
                style={{ marginBottom: 15 }}
            >
                <AssignmentCard
                    assignment={assignment}
                    showDelete={false}
                />
            </Pressable>
        );
    };

    // loading State
    if (loading) {
        return (
            <AppLinearGradient variant="assignments.background">
                <PageContainer>
                    <PageHeader title="All Assignments" showBackButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.assignments.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    // empty state
    if (assignments.length === 0) {
        return (
            <AppLinearGradient variant="assignments.background">
                <PageContainer>
                    <PageHeader title="All Assignments" showBackButton />
                    <EmptyStateView
                        icon={SYSTEM_ICONS.tag}
                        title="No assignments yet"
                        description="Add an assignment to get started!"
                        buttonText="New Assignment"
                        buttonAction={() => router.push('/assignments/NewAssignment')}
                        buttonColor={PAGE.assignments.primary[0]}
                    />
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="assignments.background">
            <PageContainer>
                <PageHeader title="All Assignments" showBackButton />

                {/* tabs */}
                <View style={styles.container}>
                    {/* tab buttons */}
                    <View style={styles.tabButtons}>
                        <Pressable onPress={() => handleTabPress('upcoming')} style={styles.tabButton}>
                            <Text style={[
                                globalStyles.body,
                                styles.tabText,
                                { opacity: activeTab === 'upcoming' ? 1 : 0.4 }
                            ]}>
                                Upcoming ({upcomingAssignments.length})
                            </Text>
                        </Pressable>

                        <Pressable onPress={() => handleTabPress('past')} style={styles.tabButton}>
                            <Text style={[
                                globalStyles.body,
                                styles.tabText,
                                { opacity: activeTab === 'past' ? 1 : 0.4 }
                            ]}>
                                Past ({pastAssignments.length})
                            </Text>
                        </Pressable>
                    </View>


                    {/* horizontal scrollview with nested vertical scrollviews */}
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={(e) => {
                            const offsetX = e.nativeEvent.contentOffset.x;
                            const index = Math.round(offsetX / TAB_WIDTH);
                            setActiveTab(index === 0 ? 'upcoming' : 'past');
                        }}
                        style={{ flex: 1 }}
                    >
                        {/* upcoming section */}
                        <View style={{ width: TAB_WIDTH }}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 40, padding: 3 }}
                            >
                                {upcomingAssignments.length === 0 ? (
                                    <View style={{ paddingTop: 40, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>No upcoming assignments</Text>
                                    </View>
                                ) : (
                                    upcomingAssignments.map(assignment => renderAssignmentCard(assignment))
                                )}
                            </ScrollView>
                        </View>

                        {/* past section */}
                        <View style={{ width: TAB_WIDTH }}>
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 40, padding: 3, }}
                            >
                                {pastAssignments.length === 0 ? (
                                    <View style={{ paddingTop: 40, alignItems: 'center' }}>
                                        <Text style={globalStyles.body}>No completed assignments</Text>
                                    </View>
                                ) : (
                                    pastAssignments.map(assignment => renderAssignmentCard(assignment))
                                )}
                            </ScrollView>
                        </View>
                    </ScrollView>

                </View>

                {/* add assignment button */}
                <View style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 0,
                }}>
                    <Pressable onPress={() => router.push('/assignments/NewAssignment')}>
                        <ShadowBox
                            contentBackgroundColor={PAGE.assignments.primary[0]}
                            borderRadius={30}
                        >
                            <View style={{
                                width: 40,
                                height: 40,
                                justifyContent: 'center',
                            }}>
                                <Text style={{ fontSize: 25, textAlign: 'center' }}>+</Text>
                            </View>
                        </ShadowBox>
                    </Pressable>
                </View>

                {/* edit assignment modal */}
                <EditAssignmentModal
                    visible={showEditModal}
                    assignment={selectedAssignment}
                    courses={courses}
                    onClose={() => {
                        setShowEditModal(false);
                        setSelectedAssignment(null);
                    }}
                />
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        height: '100%',
        paddingBottom: 50,
        overflow: 'hidden',
    },

    tabButtons: {
        flexDirection: 'row',
        marginTop: 10,
        marginBottom: 15,
        gap: 10,
    },

    tabButton: {
        flex: 1,
    },

    tabText: {
        textAlign: 'center',
    },

    horizontalScroll: {
        flex: 1,
    },

    pageContainer: {
        width: SCREEN_WIDTH - 40,
        paddingHorizontal: 0,
    },

    verticalScrollContent: {
        paddingBottom: 20,
        paddingHorizontal: 3,
        gap: 15,
    },

    emptyText: {
        textAlign: 'center',
        opacity: 0.5,
        marginTop: 20,
        fontSize: 14,
    },
});