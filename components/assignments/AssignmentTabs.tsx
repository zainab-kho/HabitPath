// @/components/assignments/AssignmentTabs.tsx
import { useRouter } from 'expo-router';
import React, { JSX, RefObject, useRef } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH - 40;

interface AssignmentTabsProps {
    activeTab: 'due' | 'thisWeek' | 'upcoming';
    onTabChange: (tab: 'due' | 'thisWeek' | 'upcoming') => void;
    dueAssignments: any[];
    thisWeekAssignments: any[];
    upcomingAssignments: any[];
    todayAssignments: boolean;
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
    todayAssignments,
    renderAssignmentCard,
    editMode,
    onDeleteAssignment,
    scrollViewRef
}: AssignmentTabsProps) {
    const router = useRouter();
    const localScrollRef = useRef<ScrollView>(null);

    const tabs = [
        { key: 'due', label: 'Due', assignments: dueAssignments },
        { key: 'thisWeek', label: 'This Week', assignments: thisWeekAssignments },
        // { key: 'upcoming', label: 'Upcoming', assignments: upcomingAssignments },
    ];

    // handle tab press - use local ref as fallback
    const handleTabPress = (tab: 'due' | 'thisWeek') => {
        onTabChange(tab);
        const tabIndex = tab === 'due' ? 0 : 1;

        setTimeout(() => {
            const ref = scrollViewRef?.current || localScrollRef?.current;
            if (ref) {
                ref.scrollTo({ x: tabIndex * TAB_WIDTH, animated: true });
            }
        }, 10);
    };

    return (
        <View style={[styles.container, { marginBottom: 15 }]}>
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
                ref={(ref) => {
                    localScrollRef.current = ref;
                    if (scrollViewRef) {
                        scrollViewRef.current = ref;
                    }
                }}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(e) => {
                    const offsetX = e.nativeEvent.contentOffset.x;
                    const index = Math.round(offsetX / TAB_WIDTH);
                    const newTab = tabs[index]?.key as 'due' | 'thisWeek';
                    if (newTab) {
                        onTabChange(newTab);
                    }
                }}
                style={styles.horizontalScroll}
            >
                {tabs.map((tab, index) => (
                    <View key={index} style={{ width: TAB_WIDTH }}>
                        <View style={{
                            paddingBottom: 15,
                            paddingHorizontal: 5,
                            gap: 15,
                        }}
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
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
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
});