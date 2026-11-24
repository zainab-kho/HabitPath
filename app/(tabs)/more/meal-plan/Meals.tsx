// @/app/(tabs)/more/meal-plan/Meals.tsx
// manage meals: set up the sections that show on the plan, and edit or delete saved meals
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Sortable from 'react-native-sortables';

// hooks
import { useAuth } from '@/contexts/AuthContext';

// data
import {
    DEFAULT_SECTIONS,
    getMealSections,
    MAX_SECTION_NAME_LENGTH,
    saveMealSections,
} from '@/lib/mealPlan/mealPlanUtils';
import { deleteMeal, loadMeals } from '@/lib/supabase/queries/mealPlan';
import { Meal, MEAL_TYPES, MealType } from '@/types/Meal';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants + styles
import { PAGE } from '@/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';

const ACCENT = PAGE.mealPlan.primary[0];
const NEW_MEAL_PATH = '/(tabs)/more/meal-plan/NewMeal';

export default function MealsPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [meals, setMeals] = useState<Meal[]>([]);
    const [sections, setSections] = useState<MealType[]>(DEFAULT_SECTIONS);
    const [loading, setLoading] = useState(true);
    const [newSectionName, setNewSectionName] = useState('');

    const loadData = useCallback(async () => {
        if (!user) return;
        try {
            const [freshMeals, savedSections] = await Promise.all([loadMeals(user.id), getMealSections()]);
            setMeals(freshMeals);
            setSections(savedSections);
        } catch (err) {
            console.error('Error loading meals:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // ─── actions ─────────────────────────────────────────────────────────────

    // every change to the sections is saved straight away
    const updateSections = (next: MealType[]) => {
        setSections(next);
        saveMealSections(next).catch(err => console.error('Error saving meal sections:', err));
    };

    // adds a section to the end of the list. works for built-in ones and made-up ones
    const addSection = (rawName: string) => {
        const name = rawName.trim();
        if (!name) return;

        const alreadyThere = sections.some(section => section.toLowerCase() === name.toLowerCase());
        if (alreadyThere) {
            Alert.alert('Already added', `"${name}" is already one of your sections.`);
            return;
        }

        updateSections([...sections, name]);
        setNewSectionName('');
    };

    // the last section can't be removed, or the plan would be empty.
    // meals already planned under a removed section still show on their days
    const removeSection = (name: MealType) => {
        if (sections.length === 1) return;
        updateSections(sections.filter(section => section !== name));
    };

    // called when a dragged section is dropped, with the list in its new order
    const handleSectionDragEnd = ({ data }: { data: MealType[] }) => updateSections(data);

    // built-in sections that aren't on the plan yet, offered as one-tap adds
    const suggestedSections = MEAL_TYPES.filter(
        type => !sections.some(section => section.toLowerCase() === type.toLowerCase())
    );

    const openEditMeal = (meal: Meal) =>
        router.push({ pathname: NEW_MEAL_PATH, params: { editId: meal.id, editData: JSON.stringify(meal) } });

    const handleDelete = (meal: Meal) => {
        Alert.alert(
            `Delete ${meal.name}?`,
            'This also removes it from every day it was planned on.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!user) return;
                        setMeals(prev => prev.filter(m => m.id !== meal.id));
                        try {
                            await deleteMeal(meal.id, user.id);
                        } catch (err) {
                            console.error('Error deleting meal:', err);
                            Alert.alert('Error', 'Failed to delete meal');
                            loadData();
                        }
                    },
                },
            ]
        );
    };

    // ─── render ──────────────────────────────────────────────────────────────

    const renderMeals = () => {
        if (loading) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={ACCENT} />
                </View>
            );
        }

        if (meals.length === 0) {
            return (
                <EmptyStateView
                    icon={SYSTEM_ICONS.grocery}
                    title="No meals yet"
                    description="Save a meal once, then add it to any day of your plan."
                    buttonText="New Meal"
                    buttonAction={() => router.push(NEW_MEAL_PATH)}
                    buttonColor={ACCENT}
                />
            );
        }

        return (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {meals.map(meal => (
                    <View key={meal.id} style={{ marginBottom: 12 }}>
                        <ShadowBox shadowOffset={{x: 0, y: 0}}>
                            <View style={styles.mealRow}>
                                {/* tap the meal to edit it */}
                                <Pressable style={{ flex: 1 }} onPress={() => openEditMeal(meal)}>
                                    <Text style={[globalStyles.body, {marginBottom: 5}]}>{meal.name}</Text>
                                    <Text style={globalStyles.label}>
                                        {meal.mealTypes.join(' · ').toUpperCase()}
                                        {meal.ingredients.length > 0 &&
                                            `  ·  ${meal.ingredients.length} INGREDIENT${meal.ingredients.length === 1 ? '' : 'S'}`}
                                    </Text>
                                </Pressable>

                                <Pressable onPress={() => handleDelete(meal)} hitSlop={10}>
                                    <Image source={SYSTEM_ICONS.trash} style={{ width: 18, height: 18 }} />
                                </Pressable>
                            </View>
                        </ShadowBox>
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <AppLinearGradient variant="mealPlan.background">
            {/* dragging the sections needs a gesture root around the page */}
            <GestureHandlerRootView style={{ flex: 1 }}>
            <PageContainer>
                <PageHeader title="My Meals" showBackButton />

                {/* the sections on each day of the plan: drag to reorder, remove, or add your own */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={[globalStyles.label, { marginBottom: 10 }]}>SECTIONS ON YOUR MEAL PLAN</Text>

                    <View style={styles.sectionsBox}>
                        {/* hold the ≡ handle and drag to reorder */}
                        <Sortable.Grid
                            data={sections}
                            columns={1}
                            customHandle
                            keyExtractor={section => section}
                            renderItem={({ item: section }) => (
                                <View style={styles.sectionRow}>
                                    <Sortable.Handle>
                                        <Text style={styles.dragHandle}>≡</Text>
                                    </Sortable.Handle>

                                    <Text style={[globalStyles.bodySmall, { flex: 1 }]} numberOfLines={1}>{section}</Text>

                                    <Pressable onPress={() => removeSection(section)} disabled={sections.length === 1} hitSlop={6}>
                                        <Text style={[styles.sectionAction, sections.length === 1 && { opacity: 0.2 }]}>✕</Text>
                                    </Pressable>
                                </View>
                            )}
                            onDragStart={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)}
                            onDragEnd={handleSectionDragEnd}
                            dragActivationDelay={150}
                            overDrag="vertical"
                            activeItemScale={1.02}
                            activeItemOpacity={1}
                            inactiveItemOpacity={1}
                            inactiveItemScale={1}
                            itemEntering={null}
                            itemExiting={null}
                        />

                        {/* type your own, like "Work break" */}
                        <View style={styles.addSectionRow}>
                            <TextInput
                                style={[globalStyles.bodySmall, { flex: 1, paddingVertical: 6 }]}
                                placeholder="Add your own, like Work break..."
                                placeholderTextColor="rgba(0,0,0,0.4)"
                                value={newSectionName}
                                onChangeText={setNewSectionName}
                                onSubmitEditing={() => addSection(newSectionName)}
                                maxLength={MAX_SECTION_NAME_LENGTH}
                                returnKeyType="done"
                                cursorColor={PAGE.mealPlan.primary[1]}
                                selectionColor={PAGE.mealPlan.primary[1]}
                            />
                            <Pressable onPress={() => addSection(newSectionName)} hitSlop={8}>
                                <Text style={[globalStyles.h2, { opacity: newSectionName.trim() ? 1 : 0.3 }]}>+</Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* built-in sections that aren't on the plan yet */}
                    {suggestedSections.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                            {suggestedSections.map(type => (
                                <Pressable key={type} style={styles.suggestionChip} onPress={() => addSection(type)}>
                                    <Text style={[globalStyles.bodyRegular, { fontSize: 13 }]}>+ {type}</Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                </View>

                <Text style={[globalStyles.label, { marginBottom: 10 }]}>SAVED MEALS</Text>
                {renderMeals()}
            </PageContainer>
            </GestureHandlerRootView>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    sectionsBox: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderWidth: 1,
        borderRadius: 15,
        backgroundColor: '#fff',
    },
    sectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 7,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.2)',
        // a solid background, so the row doesn't look see-through while it's being dragged
        backgroundColor: '#fff',
    },
    dragHandle: {
        fontSize: 20,
        lineHeight: 22,
        width: 22,
        textAlign: 'center',
        opacity: 0.5,
    },
    sectionAction: {
        fontSize: 16,
        width: 18,
        textAlign: 'center',
    },
    addSectionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    suggestionChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderRadius: 12,
        borderStyle: 'dashed',
        backgroundColor: PAGE.mealPlan.background[1],
    },
    mealRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
});
