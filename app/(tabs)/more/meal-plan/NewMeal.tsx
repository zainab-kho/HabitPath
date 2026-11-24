// @/app/(tabs)/more/meal-plan/NewMeal.tsx
// the new meal page. it doubles as the edit page when a saved meal is passed in
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

// hooks
import { useAuth } from '@/contexts/AuthContext';

// data
import { getMealSections } from '@/lib/mealPlan/mealPlanUtils';
import { addPlanEntry, createMeal, deleteMeal, updateMeal } from '@/lib/supabase/queries/mealPlan';
import { Meal, MEAL_TYPES, MealType } from '@/types/Meal';

// ui
import { fromLines, LineListInput, toLines } from '@/components/mealPlan/LineListInput';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants + styles
import { BUTTON_COLORS, PAGE } from '@/colors';
import { formStyles, globalStyles } from '@/styles';


const ACCENT = PAGE.mealPlan.primary[0];

// one of the buttons in the bar at the bottom of the card
function FooterButton({ label, color, onPress, disabled }: {
    label: string;
    color: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable onPress={onPress} disabled={disabled} style={{ flex: 1 }}>
            <ShadowBox contentBackgroundColor={color} shadowBorderRadius={15}>
                <View style={{ paddingVertical: 6 }}>
                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>{label}</Text>
                </View>
            </ShadowBox>
        </Pressable>
    );
}

export default function NewMeal() {
    const { user } = useAuth();
    const router = useRouter();

    // editId + editData: opened from a saved meal, to edit it.
    // planDate + planType: opened from the + on a day, so the new meal goes straight onto that day
    const params = useLocalSearchParams<{
        editId?: string;
        editData?: string;
        planDate?: string;
        planType?: string;
    }>();
    const isEditMode = !!params.editId;
    const editMeal: Meal | null = useMemo(
        () => (params.editData ? JSON.parse(params.editData) : null),
        [params.editData]
    );
    const planType = params.planType || null;

    // the types on offer: the user's own sections first (in their order), then the built-in ones,
    // then anything this meal already has that isn't in either list
    const [sections, setSections] = useState<MealType[]>([]);
    useEffect(() => {
        getMealSections().then(setSections);
    }, []);
    const typeOptions = useMemo(
        () => [...new Set([...sections, ...MEAL_TYPES, ...(editMeal?.mealTypes ?? [])])],
        [sections, editMeal]
    );

    const [name, setName] = useState(editMeal?.name ?? '');
    // a meal made from a day starts with that day's section already picked
    const [mealTypes, setMealTypes] = useState<MealType[]>(editMeal?.mealTypes ?? (planType ? [planType] : []));
    const [ingredients, setIngredients] = useState(() => toLines(editMeal?.ingredients ?? []));
    const [recipeLink, setRecipeLink] = useState(editMeal?.recipeLink ?? '');
    const [recipeSteps, setRecipeSteps] = useState(() => toLines(editMeal?.recipeSteps ?? []));

    const [isSaving, setIsSaving] = useState(false);

    const toggleMealType = (type: MealType) =>
        setMealTypes(prev => (prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]));

    // ─── actions ─────────────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!user) return;

        if (!name.trim()) {
            Alert.alert('Missing Info', 'Please enter a meal name');
            return;
        }
        if (mealTypes.length === 0) {
            Alert.alert('Missing Info', 'Please pick at least one meal type');
            return;
        }

        const fields = {
            name: name.trim(),
            // saved in the order they're shown, whatever order they were tapped in
            mealTypes: typeOptions.filter(type => mealTypes.includes(type)),
            ingredients: fromLines(ingredients),
            recipeLink: recipeLink.trim() || null,
            recipeSteps: fromLines(recipeSteps),
        };

        setIsSaving(true);
        try {
            if (isEditMode && params.editId) {
                await updateMeal(params.editId, user.id, fields);
            } else {
                const meal = await createMeal(user.id, fields);
                if (params.planDate && planType) {
                    await addPlanEntry(user.id, meal.id, params.planDate, planType);
                }
            }
            router.back();
        } catch (err) {
            console.error('Error saving meal:', err);
            Alert.alert('Error', 'Failed to save meal');
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Meal',
            'This also removes it from every day it was planned on.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        if (!params.editId || !user) return;
                        try {
                            await deleteMeal(params.editId, user.id);
                            router.back();
                        } catch (err) {
                            console.error('Error deleting meal:', err);
                            Alert.alert('Error', 'Failed to delete meal');
                        }
                    },
                },
            ]
        );
    };

    // ─── render ──────────────────────────────────────────────────────────────

    return (
        <AppLinearGradient variant="mealPlan.background">
            <PageContainer>
                <PageHeader title={isEditMode ? 'Edit Meal' : 'New Meal'} showBackButton />

                {/* main card: the fields scroll, the button bar stays pinned at the bottom */}
                <View style={formStyles.card}>
                    <KeyboardAwareScrollView
                        contentContainerStyle={{ padding: 30, gap: 20 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        // keeps the line being typed on above the keyboard
                        extraScrollHeight={80}
                        enableOnAndroid
                    >
                        {/* name */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 0 }]}>MEAL NAME</Text>
                            <TextInput
                                style={[
                                    globalStyles.body,
                                    { borderBottomWidth: 1, borderBottomColor: ACCENT, paddingVertical: 10 },
                                ]}
                                placeholder="Enter meal name..."
                                placeholderTextColor="rgba(0,0,0,0.4)"
                                value={name}
                                onChangeText={setName}
                                cursorColor={PAGE.mealPlan.primary[1]}
                                selectionColor={PAGE.mealPlan.primary[1]}
                                returnKeyType="done"
                            />
                        </View>

                        {/* meal type. more than one can be picked, but at least one is needed */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>MEAL TYPE</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                                {typeOptions.map(type => {
                                    const isSelected = mealTypes.includes(type);
                                    return (
                                        <Pressable key={type} onPress={() => toggleMealType(type)}>
                                            <ShadowBox
                                                contentBackgroundColor={isSelected ? ACCENT : '#fff'}
                                                shadowBorderRadius={15}
                                            >
                                                <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                                                    <Text style={globalStyles.bodySmall}>{type}</Text>
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {/* ingredients. these are what the grocery list is made from */}
                        <View>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>INGREDIENTS (OPTIONAL)</Text>
                            <LineListInput
                                lines={ingredients}
                                onChange={setIngredients}
                                placeholder="Add an ingredient..."
                            />
                        </View>

                        {/* recipe: a link and / or numbered steps */}
                        <View style={{ gap: 10 }}>
                            <Text style={globalStyles.label}>RECIPE (OPTIONAL)</Text>
                            <TextInput
                                style={[
                                    globalStyles.body,
                                    { borderBottomWidth: 1, borderBottomColor: ACCENT, paddingVertical: 10 },
                                ]}
                                placeholder="Paste a link to the recipe..."
                                placeholderTextColor="rgba(0,0,0,0.4)"
                                value={recipeLink}
                                onChangeText={setRecipeLink}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                cursorColor={PAGE.mealPlan.primary[1]}
                                selectionColor={PAGE.mealPlan.primary[1]}
                            />
                            <LineListInput
                                lines={recipeSteps}
                                onChange={setRecipeSteps}
                                placeholder="Add a step..."
                                numbered
                            />
                        </View>
                    </KeyboardAwareScrollView>

                    {/* cancel / delete (edit only) / save */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, backgroundColor: '#fff' }}>
                        <FooterButton label="Cancel" color={BUTTON_COLORS.Cancel} onPress={() => router.back()} />

                        {isEditMode && (
                            <FooterButton label="Delete" color={BUTTON_COLORS.Delete} onPress={handleDelete} />
                        )}

                        <FooterButton
                            label={isSaving ? 'Saving...' : 'Save'}
                            color={isSaving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save}
                            onPress={handleSave}
                            disabled={isSaving}
                        />
                    </View>
                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}
