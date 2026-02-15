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

  startDate: string;    // actual date string for logic (YYY-MM-DD)
  selectedDate?: string; // user-facing label like "Today" / "Tomorrow"

  rewardPoints?: number;

  path?: string; // name of the path (e.g., "Self-Care")
  pathColor?: string; // hex color

  // core streak state
  streak?: number;
  bestStreak?: number;
  lastCompletedDate?: string;


  // temporary times of days for one day
  tempTimeOfDay?: string;
  tempTimeOfDayDate?: string;

  // exceptions
  snoozedUntil?: string; // YYYY-MM-DD date string until which the habit is snoozed
  skippedDates?: string[]; // array of date strings when the habit was skipped

  // more complex habit types
  keepUntil?: boolean; // keep until user checks off

  // **TODO: make increment? an array of { date, amount } so we can track history of increments and not just the current day
  increment?: boolean;  // if user wants to track miles, sips, minutes, etc
  incrementAmount?: number; // current amount for today
  incrementGoal?: number; // target amount for increment (optional)
  incrementStep?: number;
  incrementType?: string; // e.g., 'miles', 'sips', 'minutes', 'reps'
  incrementHistory?: Record<string, number>; // date -> amount mapping

  // history
  completionHistory?: string[];
  completionEntries?: CompletionEntry[];

  completed?: boolean; // **TODO: instead of completed, compute a "status" that can be "completed", "skipped", "snoozed", "active", "missed"

}