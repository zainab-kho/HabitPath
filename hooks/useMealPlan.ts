// @/hooks/useMealPlan.ts
import { useCallback, useState } from 'react';

import { syncMealPlanWidget } from '@/lib/mealPlan/mealPlanWidgetSync';
import {
    addPlanEntry,
    loadMeals,
    loadPlanEntries,
    removePlanEntry,
} from '@/lib/supabase/queries/mealPlan';
import { Meal, MealPlanEntry, MealType } from '@/types/Meal';

// loads the saved meals plus everything planned between two dates ("YYYY-MM-DD"),
// and lets the meal plan page add or remove a meal from a day
export function useMealPlan(userId: string | undefined, fromDate: string, toDate: string) {
    const [meals, setMeals] = useState<Meal[]>([]);
    const [entries, setEntries] = useState<MealPlanEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!userId) {
            setMeals([]);
            setEntries([]);
            setLoading(false);
            return;
        }

        try {
            const [freshMeals, freshEntries] = await Promise.all([
                loadMeals(userId),
                loadPlanEntries(userId, fromDate, toDate),
            ]);
            setMeals(freshMeals);
            setEntries(freshEntries);

            // keep the widget in step. not awaited, so the page never waits on it
            syncMealPlanWidget(userId);
        } catch (err) {
            console.error('Error loading meal plan:', err);
        } finally {
            setLoading(false);
        }
    }, [userId, fromDate, toDate]);

    const addMealToDay = useCallback(async (meal: Meal, date: string, mealType: MealType) => {
        if (!userId) return;
        try {
            const entry = await addPlanEntry(userId, meal.id, date, mealType);
            setEntries(prev => [...prev, entry]);
            syncMealPlanWidget(userId);
        } catch (err) {
            console.error('Error adding meal to day:', err);
        }
    }, [userId]);

    // removed from the screen right away. if saving fails, reload to put it back
    const removeMealFromDay = useCallback(async (entryId: string) => {
        if (!userId) return;
        setEntries(prev => prev.filter(entry => entry.id !== entryId));
        try {
            await removePlanEntry(entryId, userId);
            syncMealPlanWidget(userId);
        } catch (err) {
            console.error('Error removing meal from day:', err);
            loadData();
        }
    }, [userId, loadData]);

    return { meals, entries, loading, loadData, addMealToDay, removeMealFromDay };
}
