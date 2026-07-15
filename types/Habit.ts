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


  // temporary overrides for one day
  tempTimeOfDay?: string;
  tempTimeOfDayDate?: string;
  tempOrder?: number;
  tempOrderDate?: string;
  tempSelectedDays?: string[];
  tempSelectedDaysWeek?: string;

  // exceptions
  snoozedFrom?: string; // YYYY-MM-DD date string when the habit was snoozed
  snoozedUntil?: string; // YYYY-MM-DD date string until which the habit is snoozed
  skippedDates?: string[]; // array of date strings when the habit was skipped
  archivedAt?: string; // ISO date string when the habit was archived (for skipped one-time habits)

  // more complex habit types
  keepUntil?: boolean; // keep until user checks off

  // **TODO: make increment? an array of { date, amount } so we can track history of increments and not just the current day
  increment?: boolean;  // if user wants to track miles, sips, minutes, etc
  incrementAmount?: number; // current amount for today
  incrementGoal?: number; // target amount for increment (optional)
  incrementStep?: number;
  incrementType?: string; // e.g., 'miles', 'sips', 'minutes', 'reps'
  incrementHistory?: Record<string, number>; // date -> amount mapping

  // custom frequency
  customType?: 'daily' | 'weekly' | 'monthly';
  customInterval?: number;

  // monthly repeat on the nth weekday (e.g. 1st Sunday); when unset, monthly
  // habits repeat on the start date's day of the month
  monthlyWeek?: number;    // 1-4, 5 = last
  monthlyWeekday?: string; // 'Sunday'…'Saturday'

  // end date (for any repeating habit)
  endDate?: string;

  // history
  completionHistory?: string[];
  completionEntries?: CompletionEntry[];

  completed?: boolean; // **TODO: instead of completed, compute a "status" that can be "completed", "skipped", "snoozed", "active", "missed"

  // quest linkage — real columns on the habits table (null for normal habits)
  questId?: string;                        // parent quest id
  phaseId?: string;                        // origin phase id
  questScope?: 'phase' | 'carry' | 'forever'; // what happens when the phase ends
  questName?: string;                      // parent quest name (for the card badge)

  // DEPRECATED old virtual quest-goal bridge — no longer populated; kept only so
  // leftover UI branches still compile until they're cleaned up.
  isQuestGoal?: boolean;
  questGoalId?: string;
  questSubtasks?: { id: string; name: string; completed: boolean }[];
}