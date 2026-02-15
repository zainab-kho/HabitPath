import { Habit } from "@/types/Habit";

export const isHabitCompletedOnDate = (habit: Habit, dateString: string): boolean => {
  return habit.completionHistory?.includes(dateString) ?? false;
};