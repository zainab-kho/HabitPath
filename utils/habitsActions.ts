// @/utils/habitsActions.ts
import { supabase } from '@/lib/supabase';
import { Habit } from '@/types/Habit';
import AsyncStorage from '@react-native-async-storage/async-storage';

// storage keys
const HABITS_CACHE_KEY = '@habits_cache';
const USER_RESET_KEY = '@user_reset_time';
const APP_STREAK_KEY = '@app_streak';
const TOTAL_POINTS_KEY = '@total_points';

// get user's custom reset time (default 4am)
export const getResetTime = async () => {
    const stored = await AsyncStorage.getItem(USER_RESET_KEY);
    if (!stored) return { hour: 4, minute: 0 };
    return JSON.parse(stored);
};

// calculate habit date based on reset time
// e.g., if reset is 4am, 3am counts as previous day
export const getHabitDate = (
    date = new Date(),
    resetHour = 4,
    resetMinute = 0
) => {
    const adjusted = new Date(date);
    adjusted.setHours(adjusted.getHours() - resetHour);
    adjusted.setMinutes(adjusted.getMinutes() - resetMinute);

    const year = adjusted.getFullYear();
    const month = String(adjusted.getMonth() + 1).padStart(2, '0');
    const day = String(adjusted.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// get current habit day as a Date object (at noon for consistency)
export const getCurrentHabitDay = (resetHour = 4, resetMinute = 0): Date => {
    const now = new Date();
    const habitDateStr = getHabitDate(now, resetHour, resetMinute);
    const [year, month, day] = habitDateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
};

// calculate current and best streak from completion history
export const calculateStreak = (
    history: string[] = [],
    resetHour = 4,
    resetMinute = 0
): { currentStreak: number; bestStreak: number } => {
    if (!history.length) return { currentStreak: 0, bestStreak: 0 };

    const today = getHabitDate(new Date(), resetHour, resetMinute);
    const sorted = [...history].sort().reverse();

    // calculate current streak
    let currentStreak = 0;
    const completedToday = sorted.includes(today);
    const startDay = completedToday ? 0 : 1;

    for (let i = startDay; i < sorted.length + 1; i++) {
        const checkDate = new Date();
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = getHabitDate(checkDate, resetHour, resetMinute);

        if (sorted.includes(dateStr)) {
            currentStreak++;
        } else {
            break;
        }
    }

    // calculate best streak
    let bestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    sorted.forEach(dateStr => {
        const currentDate = new Date(dateStr + 'T00:00:00');

        if (prevDate === null) {
            tempStreak = 1;
        } else {
            const dayDiff = Math.floor(
                (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (dayDiff === 1) {
                tempStreak++;
            } else {
                bestStreak = Math.max(bestStreak, tempStreak);
                tempStreak = 1;
            }
        }

        prevDate = currentDate;
    });

    bestStreak = Math.max(bestStreak, tempStreak);

    return { currentStreak, bestStreak };
};

// load habits from supabase with cache fallback
export const loadHabitsFromSupabase = async (userId: string): Promise<Habit[]> => {
    try {
        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // map supabase fields to habit type
        const habits: Habit[] = (data || []).map(row => ({
            id: row.id,
            name: row.name,
            icon: row.icon || '📝',
            frequency: row.frequency || 'Daily',
            selectedDays: row.selected_days || [],
            selectedTimeOfDay: row.selected_time_of_day || 'Anytime',

            startDate: row.start_date,                 // DATE → string
            selectedDate: row.selected_date,

            path: row.path,
            pathColor: row.path_color,

            rewardPoints: row.reward_points || 0,
            streak: row.streak || 0,
            bestStreak: row.best_streak || 0,
            lastCompletedDate: row.last_completed_date,

            tempTimeOfDay: row.temp_time_of_day,
            tempTimeOfDayDate: row.temp_time_of_day_date,

            snoozedUntil: row.snoozed_until,
            skippedDates: row.skipped_dates || [],

            completionHistory: [],
            completionEntries: [],
        }));

        // merge with cached completion data
        const cached = await AsyncStorage.getItem(HABITS_CACHE_KEY);
        if (cached) {
            const cachedHabits = JSON.parse(cached);
            const cachedMap = new Map(cachedHabits.map((h: Habit) => [h.id, h]));

            habits.forEach(habit => {
                const cachedHabit = cachedMap.get(habit.id) as Habit | undefined;
                if (cachedHabit) {
                    habit.completionHistory = cachedHabit.completionHistory || [];
                    habit.completionEntries = cachedHabit.completionEntries || [];
                }
            });
        }

        // update cache
        await AsyncStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(habits));

        return habits;
    } catch (error) {
        console.error('error loading habits:', error);
        // fallback to cache
        const cached = await AsyncStorage.getItem(HABITS_CACHE_KEY);
        return cached ? JSON.parse(cached) : [];
    }
};

// save new habit to supabase
export const saveNewHabit = async (
    habit: Omit<Habit, 'id' | 'streak' | 'bestStreak' | 'completionHistory' | 'completionEntries'>,
    userId: string
): Promise<Habit | null> => {
    try {
        const { data, error } = await supabase
            .from('habits')
            .insert([{
                user_id: userId,
                name: habit.name,
                icon: habit.icon,
                frequency: habit.frequency,
                selected_days: habit.selectedDays,
                selected_time_of_day: habit.selectedTimeOfDay,

                start_date: habit.startDate,     // 'YYYY-MM-DD'
                selected_date: habit.selectedDate,

                path: habit.path,
                path_color: habit.pathColor,

                reward_points: habit.rewardPoints ?? 0,
                streak: 0,
                best_streak: 0,
            }])
            .select()
            .single();

        if (error) throw error;

        const newHabit: Habit = {
            id: data.id,
            ...habit,
            streak: 0,
            bestStreak: 0,
            completionHistory: [],
            completionEntries: [],
        };

        // update cache
        const cached = await AsyncStorage.getItem(HABITS_CACHE_KEY);
        const habits = cached ? JSON.parse(cached) : [];
        habits.push(newHabit);
        await AsyncStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(habits));

        return newHabit;
    } catch (error) {
        console.error('error saving habit:', error);
        return null;
    }
};

// add completed property based on viewing date
export function addCompletedProperty(
    habit: Habit,
    viewingDate: Date = new Date(),
    resetHour: number = 4,
    resetMinute: number = 0
): Habit & { completed: boolean } {
    const dateStr = getHabitDate(viewingDate, resetHour, resetMinute);
    const isCompleted = habit.completionHistory?.includes(dateStr) ?? false;

    return {
        ...habit,
        completed: isCompleted,
    };
}

// add completed property to multiple habits
export function addCompletedToHabits(
    habits: Habit[],
    viewingDate: Date = new Date(),
    resetHour: number = 4,
    resetMinute: number = 0
): (Habit & { completed: boolean })[] {
    return habits.map(h => addCompletedProperty(h, viewingDate, resetHour, resetMinute));
}

// toggle habit completion status
export const toggleHabitCompletion = async (
    habitId: string,
    habits: Habit[],
    dateToToggle: string,
    resetHour: number,
    resetMinute: number,
    userId: string
): Promise<Habit[]> => {
    const updated = habits.map((habit) => {
        if (habit.id !== habitId) return habit;

        const completionHistory = habit.completionHistory || [];
        const completionEntries = habit.completionEntries || [];
        const isCurrentlyCompleted = completionHistory.includes(dateToToggle);

        let newHistory = [...completionHistory];
        let newEntries = [...completionEntries];

        if (!isCurrentlyCompleted) {
            // mark as completed
            newHistory.push(dateToToggle);
            newEntries.push({
                date: dateToToggle,
                pointsEarned: habit.rewardPoints || 0,
                timestamp: new Date().toISOString(),
            });
            addToTotalPoints(habit.rewardPoints || 0);
        } else {
            // mark as incomplete
            newHistory = completionHistory.filter((date) => date !== dateToToggle);

            const entryToRemove = completionEntries.find(e => e.date === dateToToggle);
            const pointsToSubtract = entryToRemove?.pointsEarned || habit.rewardPoints || 0;

            newEntries = completionEntries.filter((entry) => entry.date !== dateToToggle);
            subtractFromTotalPoints(pointsToSubtract);
        }

        // recalculate streaks
        const { currentStreak, bestStreak } = calculateStreak(
            newHistory,
            resetHour,
            resetMinute
        );

        const sortedHistory = newHistory.sort().reverse();
        const lastCompleted = sortedHistory.length > 0 ? sortedHistory[0] : undefined;

        return {
            ...habit,
            completionHistory: newHistory,
            completionEntries: newEntries,
            lastCompletedDate: lastCompleted,
            streak: currentStreak,
            bestStreak: Math.max(bestStreak, habit.bestStreak || 0),
        };
    });

    // update cache immediately
    await AsyncStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(updated));

    // update supabase in background
    const habitToUpdate = updated.find(h => h.id === habitId);
    if (habitToUpdate) {
        supabase
            .from('habits')
            .update({
                streak: habitToUpdate.streak,
                best_streak: habitToUpdate.bestStreak,
                last_completed_date: habitToUpdate.lastCompletedDate,
            })
            .eq('id', habitId)
            .then(({ error }) => {
                if (error) console.error('error updating habit in supabase:', error);
            });
    }

    return updated;
};

// snooze habit until tomorrow
export const snoozeHabit = async (
    habitId: string,
    habits: Habit[],
    currentViewingDate: Date,
    userId: string
): Promise<Habit[]> => {
    const tomorrow = new Date(currentViewingDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const updated = habits.map((habit) => {
        if (habit.id !== habitId) return habit;

        // for "no repeat" habits, update startDate
        if (habit.frequency === 'No Repeat' || !habit.frequency) {
            return { ...habit, snoozedUntil: tomorrowStr, startDate: tomorrowStr };
        }

        return { ...habit, snoozedUntil: tomorrowStr };
    });

    await AsyncStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(updated));

    // update supabase
    const habitToUpdate = updated.find(h => h.id === habitId);
    if (habitToUpdate) {
        await supabase
            .from('habits')
            .update({
                snoozed_until: tomorrowStr,
                start_date: habitToUpdate.startDate,
            })
            .eq('id', habitId);
    }

    return updated;
};

// skip habit for today
export const skipHabit = async (
    habitId: string,
    habits: Habit[],
    userId: string
): Promise<Habit[]> => {
    const today = new Date().toISOString().split('T')[0];

    const updated = habits.map((habit) => {
        if (habit.id !== habitId) return habit;

        const skippedDates = habit.skippedDates || [];

        // for "no repeat" habits, archive them
        if (habit.frequency === 'No Repeat' || !habit.frequency) {
            return {
                ...habit,
                skippedDates: [...skippedDates, today],
                startDate: '2099-12-31', // archive
            };
        }

        // for repeating habits, snooze to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return {
            ...habit,
            snoozedUntil: tomorrow.toISOString().split('T')[0],
            skippedDates: [...skippedDates, today],
        };
    });

    await AsyncStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(updated));

    // update supabase
    const habitToUpdate = updated.find(h => h.id === habitId);
    if (habitToUpdate) {
        await supabase
            .from('habits')
            .update({
                skipped_dates: habitToUpdate.skippedDates,
                snoozed_until: habitToUpdate.snoozedUntil,
                start_date: habitToUpdate.startDate,
            })
            .eq('id', habitId);
    }

    return updated;
};

// delete habit from supabase and cache
export const deleteHabit = async (
    habitId: string,
    habits: Habit[],
    userId: string
): Promise<Habit[]> => {
    const updated = habits.filter((h) => h.id !== habitId);

    await AsyncStorage.setItem(HABITS_CACHE_KEY, JSON.stringify(updated));

    await supabase
        .from('habits')
        .delete()
        .eq('id', habitId);

    return updated;
};

// update app streak based on completion
export const updateAppStreak = async (
    habits: Habit[],
    resetHour: number,
    resetMinute: number
): Promise<number> => {
    try {
        const today = getHabitDate(new Date(), resetHour, resetMinute);
        const storedStreak = await AsyncStorage.getItem(APP_STREAK_KEY);
        const streakData = storedStreak
            ? JSON.parse(storedStreak)
            : { streak: 0, lastVisit: null };

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getHabitDate(yesterday, resetHour, resetMinute);

        const completedToday = habits.some((h) =>
            h.completionHistory?.includes(today)
        );

        if (completedToday) {
            if (streakData.lastVisit === today) {
                return streakData.streak;
            } else if (streakData.lastVisit === yesterdayStr) {
                streakData.streak += 1;
                streakData.lastVisit = today;
                await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(streakData));
                return streakData.streak;
            } else {
                streakData.streak = 1;
                streakData.lastVisit = today;
                await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(streakData));
                return streakData.streak;
            }
        } else {
            if (
                streakData.lastVisit &&
                streakData.lastVisit !== yesterdayStr &&
                streakData.lastVisit !== today
            ) {
                streakData.streak = 0;
                streakData.lastVisit = null;
                await AsyncStorage.setItem(APP_STREAK_KEY, JSON.stringify(streakData));
                return 0;
            }
            return streakData.streak;
        }
    } catch (e) {
        console.error('error updating app streak:', e);
        return 0;
    }
};

// points management
export const getTotalPoints = async (): Promise<number> => {
    const stored = await AsyncStorage.getItem(TOTAL_POINTS_KEY);
    return stored ? Number(stored) : 0;
};

const addToTotalPoints = async (points: number) => {
    if (points <= 0) return;
    const currentTotal = await getTotalPoints();
    const newTotal = currentTotal + points;
    await AsyncStorage.setItem(TOTAL_POINTS_KEY, newTotal.toString());
};

const subtractFromTotalPoints = async (points: number) => {
    if (points <= 0) return;
    const currentTotal = await getTotalPoints();
    const newTotal = Math.max(0, currentTotal - points);
    await AsyncStorage.setItem(TOTAL_POINTS_KEY, newTotal.toString());
};