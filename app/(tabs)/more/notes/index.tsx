import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View, Image, Text, StyleSheet, TextInput } from 'react-native';

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

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const query = searchQuery.trim().toLowerCase();


    // sort order — persisted so it sticks across sessions
    const [sortOrder, setSortOrder] = useState<'latest' | 'earliest'>('latest');

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
            <AppLinearGradient variant="notes.background">
                <PageContainer showBottomNav>
                    <PageHeader title="Notes" showBackButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.notes.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="notes.background">
            <PageContainer>
                <PageHeader title="Notes" showBackButton />

                {/* search / filter / sort row */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingHorizontal: 3, marginBottom: 10 }}>
                    {searchOpen ? (
                        <View style={styles.searchBar}>
                            <Image source={SYSTEM_ICONS.search} style={{ width: 15, height: 15, opacity: 0.5 }} />
                            <TextInput
                                style={styles.searchInput}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search notes..."
                                placeholderTextColor="rgba(0,0,0,0.35)"
                                autoFocus
                                autoCorrect={false}
                                cursorColor={PAGE.notes.primary[0]}
                                selectionColor={PAGE.notes.primary[0]}
                            />
                            <Pressable hitSlop={8}>
                                <Text style={{ fontSize: 15, color: '#888' }}>✕</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <>
                            {/* sort toggle — sticks across sessions */}
                            <Pressable>
                                <ShadowBox
                                    contentBackgroundColor={PAGE.journal.foreground[0]}
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12 }}>
                                        <Text style={{ fontFamily: 'p1', fontSize: 13 }}>
                                            {sortOrder === 'latest' ? 'Latest' : 'Earliest'}
                                        </Text>
                                        <Image
                                            source={SYSTEM_ICONS.sort}
                                            style={{
                                                width: 12,
                                                height: 12,
                                                transform: [{ rotate: sortOrder === 'latest' ? '0deg' : '180deg' }],
                                            }}
                                        />
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            {/* open folder modal */}
                            <Pressable>
                                <ShadowBox
                                    contentBorderRadius={30}
                                    shadowBorderRadius={30}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                                        <Image
                                            source={SYSTEM_ICONS.folder}
                                            style={{ width: 16, height: 16}}
                                        />
                                    </View>
                                </ShadowBox>
                            </Pressable>

                            {/* search */}
                            {/* toggleSearch */}
                            <Pressable>
                                <ShadowBox
                                    contentBorderRadius={30}
                                    shadowBorderRadius={30}
                                    shadowOffset={{ x: 1, y: 1 }}
                                >
                                    <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                                        <Image source={SYSTEM_ICONS.search} style={{ width: 16, height: 16 }} />
                                    </View>
                                </ShadowBox>
                            </Pressable>
                        </>
                    )}
                </View>


                {/* floating button */}
                <View style={{ position: 'absolute', bottom: 50, right: 0, zIndex: 5 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={() => router.push('/(tabs)/more/rewards/NewRewardItem' as any)}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.notes.primary[0]}
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

const styles = StyleSheet.create({
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: PAGE.journal.border[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'p3',
        fontSize: 14,
        color: '#333',
        padding: 0,
    },
})