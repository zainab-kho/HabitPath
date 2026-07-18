// @/constants/navTabs.ts
// Single source of truth for bottom-nav destinations. Both BottomNav and the
// settings "Navigation Bar" screen read from this registry.
import { SYSTEM_ICONS } from '@/constants/icons';

export type NavTabId =
  | 'habits'
  | 'paths'
  | 'quests'
  | 'assignments'
  | 'notes'
  | 'journal'
  | 'rewards';

export interface NavDestination {
  id: NavTabId;
  label: string;
  route: string;
  // what usePathname reports (route groups like "(tabs)" are stripped)
  match: string;
  icon: any;
}

export const NAV_DESTINATIONS: Record<NavTabId, NavDestination> = {
  habits: { id: 'habits', label: 'Habits', route: '/habits', match: '/habits', icon: SYSTEM_ICONS.habit },
  paths: { id: 'paths', label: 'Paths', route: '/paths', match: '/paths', icon: SYSTEM_ICONS.path },
  quests: { id: 'quests', label: 'Quests', route: '/quests', match: '/quests', icon: SYSTEM_ICONS.quest },
  assignments: { id: 'assignments', label: 'Assignments', route: '/(tabs)/more/assignments', match: '/more/assignments', icon: SYSTEM_ICONS.assignment },
  notes: { id: 'notes', label: 'Notes', route: '/(tabs)/more/notes', match: '/more/notes', icon: SYSTEM_ICONS.lists },
  journal: { id: 'journal', label: 'Journal', route: '/(tabs)/more/journal', match: '/more/journal', icon: SYSTEM_ICONS.journal },
  rewards: { id: 'rewards', label: 'Rewards', route: '/(tabs)/more/rewards', match: '/more/rewards', icon: SYSTEM_ICONS.reward },
};

// slot 1 is always Habits and can't be changed
export const FIXED_TAB: NavTabId = 'habits';

// temporarily hidden from all user-facing entry points (nav bar, settings picker,
// drawer) until the feature ships — the pages and data model stay intact.
export const HIDDEN_TABS: NavTabId[] = ['quests'];

// the three configurable slots (2–4)
export const DEFAULT_NAV_TABS: NavTabId[] = ['paths', 'assignments', 'journal'];

// destinations the user may assign to slots 2–4 (everything except the fixed one)
export const SELECTABLE_TABS: NavTabId[] = (
  Object.keys(NAV_DESTINATIONS) as NavTabId[]
).filter(id => id !== FIXED_TAB && !HIDDEN_TABS.includes(id));

// how many slots the user configures (slots 2–4)
export const CONFIGURABLE_SLOT_COUNT = 3;
