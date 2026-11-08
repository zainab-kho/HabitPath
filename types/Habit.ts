// components/types/Habit.ts

// NOTE: currently unused — nothing writes `completionEntries`, and the only
// reference destructures it away. `completionHistory` is the real record.
// Kept as the intended richer shape: it snapshots `pointsEarned` at completion
// time so changing a habit's rewardPoints doesn't re-value past history.
export interface CompletionEntry {
  date: string;               // YYYY-MM-DD
  pointsEarned: number;       // points at time of completion
  timestamp?: string;         // optional: exact time completed
}

// Every value `frequency` is ever compared against or assigned. Capitalized —
// note this does NOT match `customType` below, which is lowercase.
export type HabitFrequency =
  | 'None'          // one-time goal: due on startDate only
  | 'Daily'
  | 'Weekly'        // on `selectedDays`
  | 'Weekly Goal'   // week-scoped: active every day Mon–Sun, completed once per week
  | 'Monthly'       // on `monthlyDay`, or `monthlyWeek` + `monthlyWeekday`
  | 'Custom';       // `customType` + `customInterval`

export interface Habit {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  created_at?: string; // snake_case: passed through raw from the habits row.
                       // Used as the "Recent" sort key on the All Goals page.

  // when does the habit appear?
  frequency: HabitFrequency;
  selectedDays?: string[];    // which weekdays, for Weekly / Custom-weekly
  selectedTimeOfDay?: string; // which section of the list it renders in
  startDate: string;          // actual date string for logic (YYYY-MM-DD); '' = inbox habit, not scheduled
  selectedDate?: string;      // user-facing label like "Today" / "Tomorrow"

  // extra details
  rewardPoints?: number;
  path?: string;              // name of the path (e.g., 'Self-Care')
  pathColor?: string;         // hex color

  // core streak state
  //
  // `streak` / `bestStreak` are NOT stored here — they're derived from
  // completionHistory by addStatusToHabits and live on HabitWithStatus.
  //
  // lastCompletedDate IS stored, and is load-bearing: it records the day the
  // habit was physically checked off, which for keepUntil habits differs from
  // the cycle date filed in completionHistory. Read by the keepUntil cycle
  // walk, Weekly Goal visibility and points-reset accounting — not derivable.
  lastCompletedDate?: string;

  // permanent position in the list. A single flat index across all habits;
  // sections are applied first, so it still orders correctly within each
  // time-of-day section. The per-day tempOrder below overrides it for one day.
  displayOrder?: number;

  // Temporary overrides. Each is a (value, scope-date) PAIR, only honored when
  // the scope date matches the day being rendered — nothing ever clears these,
  // they simply stop matching. The *Date guards compare the rendered date
  // directly; tempSelectedDaysWeek holds a MONDAY, so it covers a whole week.
  tempTimeOfDay?: string;
  tempTimeOfDayDate?: string;     // YYYY-MM-DD, must equal the rendered day
  tempOrder?: number;
  tempOrderDate?: string;         // YYYY-MM-DD, must equal the rendered day
  tempSelectedDays?: string[];
  tempSelectedDaysWeek?: string;  // YYYY-MM-DD Monday of the week it applies to

  // exceptions
  //
  // snoozedFrom/snoozedUntil form a half-open window [from, until): hidden
  // during the window, visible again ON snoozedUntil. Typed YYYY-MM-DD, but
  // legacy rows may hold full ISO strings ("2026-02-17T05:00:00Z"), which is
  // why every read slices to the first 10 chars.
  snoozedFrom?: string;
  snoozedUntil?: string;
  skippedDates?: string[]; // array of date strings when the habit was skipped
  archivedAt?: string; // ISO date string when the habit was archived (for skipped one-time habits)

  // more complex habit types
  remindMe?: boolean; // remind user at a specific time
  reminderTime?: string; // "HH:MM" (24h) local time for the reminder
  keepUntil?: boolean; // keep until user checks off

  increment?: boolean;  // if user wants to track miles, sips, minutes, etc
  // **TODO: incrementAmount duplicates incrementHistory[today] — the per-date
  // history already exists, so this is the redundant field. Remove it and read
  // through getIncrementAmount() everywhere.
  incrementAmount?: number; // current amount for today
  incrementGoal?: number; // target amount for increment (optional)
  incrementStep?: number;
  incrementType?: string; // e.g., 'miles', 'sips', 'reps', or 'Time' (special:
                          // goal is summed across the week, see isTimeTrackingHabit)
  incrementHistory?: Record<string, number>; // date -> amount mapping

  // custom frequency (lowercase, unlike HabitFrequency above)
  customType?: 'daily' | 'weekly' | 'monthly';
  customInterval?: number;

  // monthly repeat on the nth weekday (e.g. 1st Sunday); when unset, monthly
  // habits repeat on `monthlyDay` (or the start date's day for legacy habits)
  monthlyWeek?: number;    // 1-4, 5 = last
  monthlyWeekday?: string; // 'Sunday'…'Saturday'
  monthlyDay?: number;     // 1-31, day-of-month for "specific date" monthly repeat

  // end date (for any repeating habit)
  endDate?: string;

  // history — completionHistory is the source of truth for status, streaks and
  // visibility. completionEntries is the unused richer form (see above).
  completionHistory?: string[];
  completionEntries?: CompletionEntry[];

  // DEPRECATED — superseded by HabitStatus ('completed' | 'skipped' |
  // 'snoozed' | 'active' | 'missed'), computed by getHabitStatus. Nothing
  // reads or writes this field; safe to delete.
  completed?: boolean;

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
