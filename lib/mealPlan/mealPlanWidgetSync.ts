// @/lib/mealPlan/mealPlanWidgetSync.ts
import { getMealSections } from '@/lib/mealPlan/mealPlanUtils';
import { loadPlanEntries } from '@/lib/supabase/queries/mealPlan';
import { saveWidgetData } from '@/lib/widgetStorage';
import { addDaysToDate, formatLocalDate } from '@/utils/dateUtils';

// these two have to match targets/countdown-widget/MealPlanWidget.swift
const WIDGET_KEY = 'mealPlan';
const WIDGET_KIND = 'MealPlanWidget';

// how many days ahead the widget gets. it shows "today" on its own each morning,
// so it keeps working for this long without the app being opened
const DAYS_AHEAD = 14;

// hands the meal plan widget the next two weeks of planned meals.
// called whenever the meal plan loads or changes
export async function syncMealPlanWidget(userId: string): Promise<void> {
    try {
        const today = formatLocalDate(new Date());
        const [entries, sections] = await Promise.all([
            loadPlanEntries(userId, today, addDaysToDate(today, DAYS_AHEAD - 1)),
            getMealSections(),
        ]);

        // the shape has to match SharedMealPlan in MealPlanWidget.swift
        saveWidgetData(
            WIDGET_KEY,
            {
                sections,
                entries: entries.map(entry => ({
                    date: entry.date,
                    mealType: entry.mealType,
                    name: entry.meal.name,
                })),
            },
            WIDGET_KIND
        );
    } catch (err) {
        console.error('Error syncing meal plan widget:', err);
    }
}
