// @/components/assignments/AssignmentTabs.tsx
import { useRouter } from 'expo-router';
import React, { JSX, RefObject } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AssignmentTabsProps {
    activeTab: 'due' | 'thisWeek' | 'upcoming';
    onTabChange: (tab: 'due' | 'thisWeek' | 'upcoming') => void;
    dueAssignments: any[];
    thisWeekAssignments: any[];
    upcomingAssignments: any[];
    renderAssignmentCard: (assignment: any, editMode: boolean, onDelete: () => void) => JSX.Element;
    editMode: boolean;
    onDeleteAssignment: (assignmentId: string) => void;
    scrollViewRef: RefObject<ScrollView | null>; // 👈 FIXED: Allow null
}

/**
 * AssignmentTabs Component
 * 
 * Horizontal tabbed view for assignments with three categories:
 * - Due: Assignments that are due
 * - This Week: Assignments due this week  
 * - Upcoming: Future assignments
 * 
 * Features:
 * - Swipeable horizontal pages
 * - Each page scrolls vertically (nested ScrollView)
 * - Tab buttons sync with scroll position
 */
export default function AssignmentTabs({
    activeTab,
    onTabChange,
    dueAssignments,
    thisWeekAssignments,
    upcomingAssignments,
    renderAssignmentCard,
    editMode,
    onDeleteAssignment,
    scrollViewRef
}: AssignmentTabsProps) {
    const router = useRouter();

    const handleTabPress = (tab: 'due' | 'thisWeek' | 'upcoming') => {
        const pageIndex = tab === 'due' ? 0 : tab === 'thisWeek' ? 1 : 2;
        scrollViewRef.current?.scrollTo({
            x: pageIndex * (SCREEN_WIDTH - 40),
            animated: true
        });
        onTabChange(tab);
    };

    return (
        <View style={styles.container}>
            {/* tab buttons */}
            <View style={styles.tabButtons}>
                <Pressable onPress={() => handleTabPress('due')} style={styles.tabButton}>
                    <Text style={[
                        globalStyles.body,
                        styles.tabText,
                        { opacity: activeTab === 'due' ? 1 : 0.4 }
                    ]}>
                        Due ({dueAssignments.length})
                    </Text>
                </Pressable>

                <Pressable onPress={() => handleTabPress('thisWeek')} style={styles.tabButton}>
                    <Text style={[
                        globalStyles.body,
                        styles.tabText,
                        { opacity: activeTab === 'thisWeek' ? 1 : 0.4 }
                    ]}>
                        This Week ({thisWeekAssignments.length})
                    </Text>
                </Pressable>

                <Pressable onPress={() => handleTabPress('upcoming')} style={styles.tabButton}>
                    <Text style={[
                        globalStyles.body,
                        styles.tabText,
                        { opacity: activeTab === 'upcoming' ? 1 : 0.4 }
                    ]}>
                        Upcoming ({upcomingAssignments.length})
                    </Text>
                </Pressable>
            </View>

            {/* horizontal scroll view pages */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const page = Math.round(e.nativeEvent.contentOffset.x / (SCREEN_WIDTH - 40));
                    const newTab = page === 0 ? 'due' : page === 1 ? 'thisWeek' : 'upcoming';
                    onTabChange(newTab);
                }}
                style={styles.horizontalScroll}
            >
                {/* map through each tab's assignments */}
                {[dueAssignments, thisWeekAssignments, upcomingAssignments].map(
                    (assignmentsArray, index) => (
                        <View
                            key={index}
                            style={styles.pageContainer}
                        >
                            {/* nested scrollview for vertical scrolling */}
                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.verticalScrollContent}
                                nestedScrollEnabled={true}
                            >
                                {/* render assignments */}
                                {assignmentsArray.map(assignment =>
                                    renderAssignmentCard(
                                        assignment,
                                        editMode,
                                        () => onDeleteAssignment(assignment.id!)
                                    )
                                )}

                                {index === 2 && assignmentsArray.length > 0 && (
                                    <ShadowBox>
                                        <Pressable
                                            style={{
                                                paddingVertical: 7,
                                                alignItems: 'center',
                                            }}
                                        onPress={() => router.push('/assignments/AllAssignments')}
                                        >
                                            <Text style={globalStyles.body}>View All Assignments</Text>
                                        </Pressable>
                                    </ShadowBox>
                                )}


                                {/* empty state */}
                                {assignmentsArray.length === 0 && (
                                    <Text style={[globalStyles.body, styles.emptyText]}>
                                        {index === 0
                                            ? 'No assignments due'
                                            : index === 1
                                                ? 'No assignments this week'
                                                : 'No upcoming assignments'}
                                    </Text>
                                )}
                            </ScrollView>
                        </View>
                    )
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        height: 400,
        backgroundColor: PAGE.assignments.background[0],
        borderRadius: 20,
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