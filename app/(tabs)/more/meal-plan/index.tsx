// @/app/(tabs)/more/mealPlanß/index.tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// hooks
import { useNotes } from '@/hooks/useNotes';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants
import { COLORS, PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

// components
import { FloatingActions } from '@/components/mealPlan/FloatingActions';
import { globalStyles } from '@/styles';
import { DayMealPlan } from '@/components/mealPlan/dayMealSection';

export default function MealPlanPage() {
    const { user } = useAuth();
    const router = useRouter();
    // drawer access shows a back button; otherwise the bottom nav
    const { from } = useLocalSearchParams<{ from?: string }>();
    const fromDrawer = from === 'drawer';

    // **TODO: remove temporary useNotes placeholder data when mealPlan has real data
    const {
        loading,
        loadData,
    } = useNotes(user?.id);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const [dayView, setDayView] = useState(true);
    const [showMoreMenu, setShowMoreMenu] = useState(false);

    if (loading) {
        return (
            <AppLinearGradient variant="mealPlan.background">
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <PageContainer showBottomNav={!fromDrawer}>
                        <PageHeader title="Meal Plan" showBackButton={fromDrawer} />
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={PAGE.mealPlan.primary[0]} />
                        </View>
                    </PageContainer>
                </GestureHandlerRootView>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="mealPlan.background">
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PageContainer showBottomNav={!fromDrawer}>
                    <PageHeader title="Meal Plan" showBackButton={fromDrawer} />

                    <>
                        {/* day view or week view pill */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'center',
                                marginBottom: 10,
                            }}
                        >
                            {/* Day View button */}
                            <Pressable
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderWidth: 1,
                                    borderBottomLeftRadius: 12,
                                    borderTopLeftRadius: 12,
                                    backgroundColor: dayView ? PAGE.mealPlan.primary[0] : '#dddddd',
                                }}
                                onPress={() => setDayView(true)}
                            >
                                <Text
                                    style={[
                                        globalStyles.body2,
                                        {
                                            color: dayView ? '#000' : '#707070dd',
                                            fontSize: 13,
                                        },
                                    ]}
                                >
                                    {/* {formatDateHeader(Date)} */}
                                    Day View
                                </Text>
                            </Pressable>
                            <Pressable
                                style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 5,
                                    borderTopWidth: 1,
                                    borderRightWidth: 1,
                                    borderBottomWidth: 1,
                                    borderBottomEndRadius: 12,
                                    borderTopEndRadius: 12,
                                    backgroundColor: dayView ? '#dddddd' : PAGE.mealPlan.primary[0],
                                }}
                                onPress={() => setDayView(false)}
                            >
                                <Text
                                    style={[
                                        globalStyles.body2,
                                        {
                                            color: dayView ? '#707070dd' : '#000',
                                            fontSize: 13,
                                        },
                                    ]}
                                >
                                    {/* {formatDateHeader(Date)} */}
                                    Week View
                                </Text>
                            </Pressable>
                        </View>

                        {/* day view */}
                        <View
                            style={{
                                borderRadius: 20,
                                padding: 10,
                                marginBottom: 20,
                                justifyContent: 'flex-end',
                                backgroundColor: '#B2D1FF',
                                // height: 550
                                // **TODO: fix height
                            }}
                        >
                            <View style={{ marginBottom: 10 }}>
                                <Text style={globalStyles.body}>Tue Nov 10</Text>
                            </View>

                            {/* **TODO: this will be based on user's actual choices 
                                (if they want lunch dinner etc or if they DONT want to include 
                                something) */}
                            <DayMealPlan
                                MealSection='Breakfast'
                            />

                            <DayMealPlan
                                MealSection='Lunch'
                            />

                        </View>


                        <FloatingActions
                            showMoreMenu={false}
                            onToggleMenu={() => setShowMoreMenu(prev => !prev)}
                            onAddMeal={() => {
                                setShowMoreMenu(false);
                                router.push('/(tabs)/more/meal-plan/NewMeal');
                            }}
                        />

                    </>
                </PageContainer>
            </GestureHandlerRootView>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({

});
