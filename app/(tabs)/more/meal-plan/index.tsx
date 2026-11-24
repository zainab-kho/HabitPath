// @/app/(tabs)/more/meal-plan/index.tsx
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// hooks
import { useAuth } from '@/contexts/AuthContext';
import { useMealPlan } from '@/hooks/useMealPlan';

// data
import { DEFAULT_SECTIONS, getMealSections } from '@/lib/mealPlan/mealPlanUtils';
import { Meal, MealPlanEntry, MealType } from '@/types/Meal';
import { addDaysToDate, formatLocalDate, getWeekDatesForDate, parseLocalDate } from '@/utils/dateUtils';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';

// constants + styles
import { PAGE } from '@/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';

// components
import { DayMealPlan } from '@/components/mealPlan/dayMealSection';
import { FloatingActions } from '@/components/mealPlan/FloatingActions';
import MealPickerModal from '@/components/mealPlan/MealPickerModal';

const NEW_MEAL_PATH = '/(tabs)/more/meal-plan/NewMeal';

// "Tue Nov 10"
const formatDayLabel = (date: string) =>
    parseLocalDate(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

// "Nov 8 - Nov 14"
const formatWeekLabel = (weekDates: string[]) => {
    const format = (date: string) =>
        parseLocalDate(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${format(weekDates[0])} - ${format(weekDates[6])}`;
};

export default function MealPlanPage() {
    const { user } = useAuth();
    const router = useRouter();

    // opened from the drawer: show a back button. otherwise show the bottom nav
    const { from } = useLocalSearchParams<{ from?: string }>();
    const fromDrawer = from === 'drawer';

    const [dayView, setDayView] = useState(true);
    const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(new Date()));

    // the whole week around the selected day is loaded at once,
    // so moving between its days (or switching views) doesn't need another fetch
    const weekDates = useMemo(() => getWeekDatesForDate(selectedDate), [selectedDate]);
    const { meals, entries, loading, loadData, addMealToDay, removeMealFromDay } =
        useMealPlan(user?.id, weekDates[0], weekDates[6]);

    // which sections show on each day (changed on the manage meals page)
    const [sections, setSections] = useState<MealType[]>(DEFAULT_SECTIONS);

    // the day + section the meal picker is adding to. null while it's closed
    const [pickerTarget, setPickerTarget] = useState<{ date: string; mealType: MealType } | null>(null);

    useFocusEffect(
        useCallback(() => {
            loadData();
            getMealSections().then(setSections);
        }, [loadData])
    );

    // ─── actions ─────────────────────────────────────────────────────────────

    // the arrows move one day in day view and one week in week view
    const moveDate = (direction: 1 | -1) =>
        setSelectedDate(prev => addDaysToDate(prev, direction * (dayView ? 1 : 7)));

    const handlePickMeal = (meal: Meal) => {
        if (pickerTarget) addMealToDay(meal, pickerTarget.date, pickerTarget.mealType);
        setPickerTarget(null);
    };

    // a new meal made from the picker is put straight onto the day it was opened from
    const handleCreateFromPicker = () => {
        if (!pickerTarget) return;
        router.push({
            pathname: NEW_MEAL_PATH,
            params: { planDate: pickerTarget.date, planType: pickerTarget.mealType },
        });
        setPickerTarget(null);
    };

    const openEditMeal = (meal: Meal) =>
        router.push({ pathname: NEW_MEAL_PATH, params: { editId: meal.id, editData: JSON.stringify(meal) } });

    const handlePressMeal = (entry: MealPlanEntry) => {
        Alert.alert(entry.meal.name, undefined, [
            { text: 'View / edit meal', onPress: () => openEditMeal(entry.meal) },
            { text: 'Remove from this day', style: 'destructive', onPress: () => removeMealFromDay(entry.id) },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    // ─── render ──────────────────────────────────────────────────────────────

    const renderDay = (date: string) => {
        const dayEntries = entries.filter(entry => entry.date === date);

        // always show the chosen sections, plus any other section that already has a meal on this day
        const extraSections = dayEntries.map(entry => entry.mealType).filter(type => !sections.includes(type));
        const daySections = [...new Set([...sections, ...extraSections])];

        return (
            <View key={date} style={[styles.dayCard, !dayView && styles.weekDayCard]}>
                {/* day view already shows the date between the arrows */}
                {!dayView && (
                    <View style={{ marginBottom: 6 }}>
                        <Text style={globalStyles.body}>{formatDayLabel(date)}</Text>
                    </View>
                )}

                {daySections.map(section => (
                    <DayMealPlan
                        key={section}
                        section={section}
                        entries={dayEntries.filter(entry => entry.mealType === section)}
                        onAddMeal={() => setPickerTarget({ date, mealType: section })}
                        onPressMeal={handlePressMeal}
                        compact={!dayView}
                    />
                ))}
            </View>
        );
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={PAGE.mealPlan.primary[0]} />
                </View>
            );
        }

        return (
            <ScrollView
                showsVerticalScrollIndicator={false}
                // room at the bottom so the last day can scroll clear of the floating buttons
                contentContainerStyle={{ paddingBottom: 80 }}
            >
                {dayView ? renderDay(selectedDate) : weekDates.map(renderDay)}
            </ScrollView>
        );
    };

    return (
        <AppLinearGradient variant="mealPlan.background">
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PageContainer showBottomNav={!fromDrawer}>
                    <PageHeader title="Meal Plan" showBackButton={fromDrawer} />

                    {/* day view / week view pill */}
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 10 }}>
                        <Pressable
                            style={[styles.viewPill, styles.viewPillLeft, dayView && styles.viewPillActive]}
                            onPress={() => setDayView(true)}
                        >
                            <Text style={[globalStyles.bodyRegular, styles.viewPillText, dayView && { color: '#000' }]}>
                                Day View
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[styles.viewPill, styles.viewPillRight, !dayView && styles.viewPillActive]}
                            onPress={() => setDayView(false)}
                        >
                            <Text style={[globalStyles.bodyRegular, styles.viewPillText, !dayView && { color: '#000' }]}>
                                Week View
                            </Text>
                        </Pressable>
                    </View>

                    {/* previous / next, with the day or week being shown in the middle */}
                    <View style={styles.dateNav}>
                        <Pressable onPress={() => moveDate(-1)} hitSlop={10}>
                            <Image source={SYSTEM_ICONS.sortLeft} style={styles.navArrow} />
                        </Pressable>
                        <Text style={globalStyles.body}>
                            {dayView ? formatDayLabel(selectedDate) : formatWeekLabel(weekDates)}
                        </Text>
                        <Pressable onPress={() => moveDate(1)} hitSlop={10}>
                            <Image source={SYSTEM_ICONS.sortRight} style={styles.navArrow} />
                        </Pressable>
                    </View>

                    {renderContent()}

                    <FloatingActions
                        fromDrawer={fromDrawer}
                        onOpenMeals={() => router.push('/(tabs)/more/meal-plan/Meals')}
                        // the grocery list is built from the week being looked at
                        onOpenGrocery={() => router.push({
                            pathname: '/(tabs)/more/meal-plan/Grocery',
                            params: { weekStart: weekDates[0], weekEnd: weekDates[6] },
                        })}
                        onAddMeal={() => router.push(NEW_MEAL_PATH)}
                    />
                </PageContainer>
            </GestureHandlerRootView>

            <MealPickerModal
                visible={!!pickerTarget}
                mealType={pickerTarget?.mealType ?? null}
                meals={meals}
                onPick={handlePickMeal}
                onCreateNew={handleCreateFromPicker}
                onClose={() => setPickerTarget(null)}
            />
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    viewPill: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderWidth: 1,
        backgroundColor: '#dddddd',
    },
    viewPillLeft: {
        borderBottomLeftRadius: 12,
        borderTopLeftRadius: 12,
    },
    viewPillRight: {
        borderLeftWidth: 0,
        borderBottomEndRadius: 12,
        borderTopEndRadius: 12,
    },
    viewPillActive: {
        backgroundColor: PAGE.mealPlan.primary[0],
    },
    viewPillText: {
        fontSize: 13,
        color: '#707070dd',
    },
    dateNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 5,
    },
    navArrow: {
        width: 18,
        height: 18,
    },
    dayCard: {
        borderRadius: 20,
        padding: 10,
        marginBottom: 20,
        backgroundColor: PAGE.mealPlan.background[0],
    },
    // week view: tighter, with a border so each day reads as its own card
    weekDayCard: {
        borderWidth: 1,
        borderRadius: 15,
        paddingBottom: 4,
        marginBottom: 10,
    },
});
