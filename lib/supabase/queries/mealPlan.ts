// @/lib/supabase/queries/mealPlan.ts
import { supabase } from '@/lib/supabase';
import { GroceryItem, Meal, MealPlanEntry, MealType } from '@/types/Meal';

// everything the new / edit meal page can change
export type MealFields = Pick<Meal, 'name' | 'mealTypes' | 'ingredients' | 'recipeLink' | 'recipeSteps'>;

// ─── mappers ─────────────────────────────────────────────────────────────────

const mapMeal = (row: any): Meal => ({
    id: row.id,
    userId: row.user_id,
    name: row.name ?? '',
    mealTypes: (row.meal_types ?? []) as MealType[],
    ingredients: (row.ingredients ?? []) as string[],
    recipeLink: row.recipe_link ?? null,
    recipeSteps: (row.recipe_steps ?? []) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

const mapEntry = (row: any): MealPlanEntry => ({
    id: row.id,
    mealId: row.meal_id,
    date: row.plan_date,
    mealType: row.meal_type as MealType,
    meal: mapMeal(row.meals),
});

const mapGroceryItem = (row: any): GroceryItem => ({
    id: row.id,
    name: row.name,
    checked: row.checked ?? false,
    source: row.source === 'meal' ? 'meal' : 'manual',
    createdAt: row.created_at,
});

const toMealRow = (fields: MealFields) => ({
    name: fields.name,
    meal_types: fields.mealTypes,
    ingredients: fields.ingredients,
    recipe_link: fields.recipeLink,
    recipe_steps: fields.recipeSteps,
});

// ─── meals ───────────────────────────────────────────────────────────────────

// alphabetical, so the picker and the manage page are easy to scan
export async function loadMeals(userId: string): Promise<Meal[]> {
    const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapMeal);
}

export async function createMeal(userId: string, fields: MealFields): Promise<Meal> {
    const { data, error } = await supabase
        .from('meals')
        .insert({ user_id: userId, ...toMealRow(fields) })
        .select()
        .single();

    if (error) throw error;
    return mapMeal(data);
}

export async function updateMeal(mealId: string, userId: string, fields: MealFields): Promise<void> {
    const { error } = await supabase
        .from('meals')
        .update({ ...toMealRow(fields), updated_at: new Date().toISOString() })
        .eq('id', mealId)
        .eq('user_id', userId);

    if (error) throw error;
}

// the database also removes this meal from every day it was planned on
export async function deleteMeal(mealId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)
        .eq('user_id', userId);

    if (error) throw error;
}

// ─── meal plan ───────────────────────────────────────────────────────────────

// every planned meal between two dates ("YYYY-MM-DD", both included)
export async function loadPlanEntries(userId: string, fromDate: string, toDate: string): Promise<MealPlanEntry[]> {
    const { data, error } = await supabase
        .from('meal_plan_entries')
        .select('*, meals(*)')
        .eq('user_id', userId)
        .gte('plan_date', fromDate)
        .lte('plan_date', toDate)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).filter(row => row.meals).map(mapEntry);
}

export async function addPlanEntry(
    userId: string,
    mealId: string,
    date: string,
    mealType: MealType
): Promise<MealPlanEntry> {
    const { data, error } = await supabase
        .from('meal_plan_entries')
        .insert({ user_id: userId, meal_id: mealId, plan_date: date, meal_type: mealType })
        .select('*, meals(*)')
        .single();

    if (error) throw error;
    return mapEntry(data);
}

export async function removePlanEntry(entryId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('meal_plan_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', userId);

    if (error) throw error;
}

// ─── grocery list ────────────────────────────────────────────────────────────

// oldest first, so new items land at the bottom of the list
export async function loadGroceryItems(userId: string): Promise<GroceryItem[]> {
    const { data, error } = await supabase
        .from('grocery_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapGroceryItem);
}

export async function addGroceryItem(userId: string, name: string): Promise<GroceryItem> {
    const { data, error } = await supabase
        .from('grocery_items')
        .insert({ user_id: userId, name, source: 'manual' })
        .select()
        .single();

    if (error) throw error;
    return mapGroceryItem(data);
}

export async function setGroceryItemChecked(itemId: string, userId: string, checked: boolean): Promise<void> {
    const { error } = await supabase
        .from('grocery_items')
        .update({ checked })
        .eq('id', itemId)
        .eq('user_id', userId);

    if (error) throw error;
}

export async function deleteGroceryItem(itemId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('grocery_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);

    if (error) throw error;
}

// removes checked items only, or the whole list
export async function clearGroceryItems(userId: string, which: 'checked' | 'all'): Promise<void> {
    let query = supabase.from('grocery_items').delete().eq('user_id', userId);
    if (which === 'checked') query = query.eq('checked', true);

    const { error } = await query;
    if (error) throw error;
}

// swaps the meal-plan items for a fresh set of ingredient names.
// anything typed in by hand is left alone
export async function replaceMealGroceryItems(userId: string, names: string[]): Promise<void> {
    const { error: deleteError } = await supabase
        .from('grocery_items')
        .delete()
        .eq('user_id', userId)
        .eq('source', 'meal');
    if (deleteError) throw deleteError;

    if (names.length === 0) return;

    const { error: insertError } = await supabase
        .from('grocery_items')
        .insert(names.map(name => ({ user_id: userId, name, source: 'meal' })));
    if (insertError) throw insertError;
}
