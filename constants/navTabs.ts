// @/constants/navTabs.ts
// every page that can go in the bottom nav bar. the nav bar itself and the
// "navigation bar" page in settings both read from here, so they always agree
import { SYSTEM_ICONS } from '@/constants/icons';

export type NavTabId =
  | 'habits'
  | 'paths'
  | 'assignments'
  | 'notes'
  | 'journal'
  | 'rewards'
  | 'mealPlan'
  | 'countdown';

export interface NavDestination {
  id: NavTabId;
  label: string;
  // where tapping the tab goes
  route: string;
  // how the current page's path looks when this tab is open. expo router leaves out
  // route groups like "(tabs)", so this is what the nav bar compares against to highlight the tab
  match: string;
  icon: any;
}

export const NAV_DESTINATIONS: Record<NavTabId, NavDestination> = {
  habits: { id: 'habits', label: 'Habits', route: '/habits', match: '/habits', icon: SYSTEM_ICONS.habit },
  paths: { id: 'paths', label: 'Paths', route: '/paths', match: '/paths', icon: SYSTEM_ICONS.path },
  assignments: { id: 'assignments', label: 'Assignments', route: '/(tabs)/more/assignments', match: '/more/assignments', icon: SYSTEM_ICONS.assignment },
  notes: { id: 'notes', label: 'Notes', route: '/(tabs)/more/notes', match: '/more/notes', icon: SYSTEM_ICONS.lists },
  journal: { id: 'journal', label: 'Journal', route: '/(tabs)/more/journal', match: '/more/journal', icon: SYSTEM_ICONS.journal },
  rewards: { id: 'rewards', label: 'Rewards', route: '/(tabs)/more/rewards', match: '/more/rewards', icon: SYSTEM_ICONS.reward },
  mealPlan: { id: 'mealPlan', label: 'Meal Plan', route: '/(tabs)/more/meal-plan', match: '/more/meal-plan', icon: SYSTEM_ICONS.grocery },
  countdown: { id: 'countdown', label: 'Countdown', route: '/(tabs)/more/countdown', match: '/more/countdown', icon: SYSTEM_ICONS.stopwatch },
};

/* ============================================================================
   SLOTS
============================================================================ */

// the first tab is always habits and can't be changed
export const FIXED_TAB: NavTabId = 'habits';

// how many tabs after that one people get to choose
export const CONFIGURABLE_SLOT_COUNT = 3;

// what those choosable tabs are until someone changes them
export const DEFAULT_NAV_TABS: NavTabId[] = ['paths', 'assignments', 'journal'];

// everything that can be picked for a choosable tab: all pages except the fixed one
export const SELECTABLE_TABS: NavTabId[] = (
  Object.keys(NAV_DESTINATIONS) as NavTabId[]
).filter(id => id !== FIXED_TAB);
