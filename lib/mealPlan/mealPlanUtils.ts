// @/lib/mealPlan/mealPlanUtils.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/storage/keys';
import { MealPlanEntry, MealType } from '@/types/Meal';

// ─── sections ────────────────────────────────────────────────────────────────
// the sections that show on each day, in the order the user arranged them.
// they can be built-in ones (breakfast, lunch...) or made-up ones. saved on the device

export const MAX_SECTION_NAME_LENGTH = 20;

export const DEFAULT_SECTIONS: MealType[] = ['Breakfast', 'Lunch', 'Dinner'];

export async function getMealSections(): Promise<MealType[]> {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_PLAN_SECTIONS);
        if (!stored) return DEFAULT_SECTIONS;

        // drop anything empty or repeated, keeping the saved order
        const saved = JSON.parse(stored) as string[];
        const sections = [...new Set(saved.map(name => String(name).trim()).filter(Boolean))];
        return sections.length > 0 ? sections : DEFAULT_SECTIONS;
    } catch {
        return DEFAULT_SECTIONS;
    }
}

export async function saveMealSections(sections: MealType[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_PLAN_SECTIONS, JSON.stringify(sections));
}

// ─── grocery list ────────────────────────────────────────────────────────────

// every ingredient from the planned meals, with repeats removed.
// "Eggs" and "eggs " count as the same thing, and the first spelling wins
export function collectIngredients(entries: MealPlanEntry[]): string[] {
    const seen = new Set<string>();
    const ingredients: string[] = [];

    for (const entry of entries) {
        for (const ingredient of entry.meal.ingredients) {
            const name = ingredient.trim();
            const key = name.toLowerCase();
            if (!name || seen.has(key)) continue;

            seen.add(key);
            ingredients.push(name);
        }
    }

    return ingredients;
}
