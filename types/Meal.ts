// @/types/Meal.ts

// a section of the day a meal can go in. it's just a name, so people can make their own
// (like "Work break") on top of the built-in ones
export type MealType = string;

// the built-in sections, offered as quick picks
export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert'];

// a saved meal. it can be put on as many days as you like
export interface Meal {
    id: string;
    userId: string;
    name: string;
    // which sections this meal shows up under when picking a meal
    mealTypes: MealType[];
    ingredients: string[];
    recipeLink: string | null;
    recipeSteps: string[];
    createdAt: string;
    updatedAt: string;
}

// one meal placed on one day, in one section
export interface MealPlanEntry {
    id: string;
    mealId: string;
    date: string; // "YYYY-MM-DD"
    mealType: MealType;
    // the meal itself, so the plan can show its name without a second lookup
    meal: Meal;
}

export interface GroceryItem {
    id: string;
    name: string;
    checked: boolean;
    // 'meal' items come from the meal plan and get replaced when the list is regenerated.
    // 'manual' items were typed in and are left alone
    source: 'meal' | 'manual';
    createdAt: string;
}
