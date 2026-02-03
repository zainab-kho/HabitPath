// components/types/Habit.ts
export interface CompletionEntry {
  date: string;           // YYYY-MM-DD
  pointsEarned: number;   // points at time of completion
  timestamp?: string;     // optional: exact time completed
}

export interface Habit {
  id: string;
  name: string;
  icon: string;

  frequency: string;
  selectedDays?: string[];
  selectedTimeOfDay?: string;

  completed?: boolean;

  // temporary times of days for one day
  tempTimeOfDay?: string;
  tempTimeOfDayDate?: string;

  startDate: string;    // actual date string for logic (YYY-MM-DD)
  selectedDate?: string; // user-facing label like "Today" / "Tomorrow"

  path?: string; // name of the path (e.g., "Self-Care")
  pathColor?: string; // hex color

  rewardPoints?: number;

  keepUntil?: boolean; // keep until user checks off
  increment?: boolean;  // if user wants to track miles, sips, minutes, etc
  incrementAmount?: number; // current amount for today
  incrementGoal?: number; // target amount for increment (optional)
  incrementType?: string; // e.g., 'miles', 'sips', 'minutes', 'reps'
  incrementHistory?: Record<string, number>; // date -> amount mapping

  // core streak state
  streak?: number;
  bestStreak?: number;
  lastCompletedDate?: string;

  // history
  completionHistory?: string[];
  completionEntries?: CompletionEntry[];

  // exceptions
  snoozedUntil?: string; // YYYY-MM-DD date string until which the habit is snoozed
  skippedDates?: string[]; // array of date strings when the habit was skipped
}