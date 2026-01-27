// @/components/assignments/AssignmentTabs.tsx
import { useRouter } from 'expo-router';
import React, { JSX, RefObject } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH - 40;

interface AssignmentTabsProps {
    activeTab: 'due' | 'thisWeek' | 'upcoming';
    onTabChange: (tab: 'due' | 'thisWeek' | 'upcoming') => void;
    dueAssignments: any[];
    thisWeekAssignments: any[];
    upcomingAssignments: any[];
    renderAssignmentCard: (assignment: any, editMode: boolean, onDelete: () => void) => JSX.Element;
    editMode: boolean;
    onDeleteAssignment: (assignmentId: string) => void;
    scrollViewRef: RefObject<ScrollView | null>;
}

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

    // handle tab press
    const handleTabPress = (tab: 'due' | 'thisWeek' | 'upcoming') => {
        onTabChange(tab);
        const tabIndex = tab === 'due' ? 0 : tab === 'thisWeek' ? 1 : 2;
        
        // use setTimeout to ensure state update happens first
        setTimeout(() => {
            scrollViewRef.current?.scrollTo({ x: tabIndex * TAB_WIDTH, animated: true });
        }, 0);
    };

    const tabs = [
        { key: 'due', label: 'Due', assignments: dueAssignments },
        { key: 'thisWeek', label: 'This Week', assignments: thisWeekAssignments },
        { key: 'upcoming', label: 'Upcoming', assignments: upcomingAssignments },
    ];

    return (
        <View style={styles.container}>
            {/* tab buttons */}
            <View style={styles.tabButtons}>
                {tabs.map(tab => (
                    <Pressable key={tab.key} onPress={() => handleTabPress(tab.key as any)} style={styles.tabButton}>
                        <Text style={[
                            globalStyles.body,
                            styles.tabText,
                            { opacity: activeTab === tab.key ? 1 : 0.4 }
                        ]}>
                            {tab.label} ({tab.assignments.length})
                        </Text>
                    </Pressable>
                ))}
            </View>

            {/* horizontal scrollview */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    const index = Math.round(offsetX / TAB_WIDTH);
                    const newTab = tabs[index]?.key as 'due' | 'thisWeek' | 'upcoming';
                    if (newTab) {
                        onTabChange(newTab);
                    }
                }}
                style={styles.horizontalScroll}
            >
                {tabs.map((tab, index) => (
                    <View key={index} style={{ width: TAB_WIDTH }}>
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.verticalScrollContent}
                            nestedScrollEnabled
                        >
                            {tab.assignments.length === 0 ? (
                                <View style={{ paddingTop: 20, alignItems: 'center', opacity: 0.4 }}>
                                    <Text style={globalStyles.body}>
                                        {tab.key === 'due'
                                            ? 'No assignments due'
                                            : tab.key === 'thisWeek'
                                                ? 'No assignments this week'
                                                : 'No upcoming assignments'}
                                    </Text>
                                </View>
                            ) : (
                                tab.assignments.map(assignment =>
                                    renderAssignmentCard(
                                        assignment,
                                        editMode,
                                        () => onDeleteAssignment(assignment.id!)
                                    )
                                )
                            )}

                            {index === 2 && tab.assignments.length > 0 && (
                                <ShadowBox>
                                    <Pressable
                                        style={{ paddingVertical: 7, alignItems: 'center' }}
                                        onPress={() => router.push('/assignments/AllAssignments')}
                                    >
                                        <Text style={globalStyles.body}>View All Assignments</Text>
                                    </Pressable>
                                </ShadowBox>
                            )}
                        </ScrollView>
                    </View>
                ))}
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

    verticalScrollContent: {
        paddingBottom: 20,
        paddingHorizontal: 5,
        gap: 15,
    },
});