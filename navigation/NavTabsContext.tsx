// @/navigation/NavTabsContext.tsx
// Holds the user's configurable bottom-nav tabs (slots 2–4) and keeps BottomNav
// and the settings screen in sync live, persisting changes to AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  CONFIGURABLE_SLOT_COUNT,
  DEFAULT_NAV_TABS,
  NAV_DESTINATIONS,
  NavTabId,
  SELECTABLE_TABS,
} from '@/constants/navTabs';
import { STORAGE_KEYS } from '@/storage/keys';

interface NavTabsContextType {
  // the three configurable tab ids (slots 2–4)
  navTabs: NavTabId[];
  // replace the configurable tabs; ignored unless exactly CONFIGURABLE_SLOT_COUNT valid ids
  setNavTabs: (tabs: NavTabId[]) => void;
  resetNavTabs: () => void;
  loaded: boolean;
}

const NavTabsContext = createContext<NavTabsContextType | undefined>(undefined);

// drop unknown/duplicate ids; only accept a fully-valid set of the right size
function sanitize(tabs: unknown): NavTabId[] | null {
  if (!Array.isArray(tabs)) return null;
  const seen = new Set<string>();
  const valid: NavTabId[] = [];
  for (const t of tabs) {
    if (typeof t !== 'string') continue;
    if (!SELECTABLE_TABS.includes(t as NavTabId)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    valid.push(t as NavTabId);
  }
  return valid.length === CONFIGURABLE_SLOT_COUNT ? valid : null;
}

export function NavTabsProvider({ children }: { children: React.ReactNode }) {
  const [navTabs, setNavTabsState] = useState<NavTabId[]>(DEFAULT_NAV_TABS);
  const [loaded, setLoaded] = useState(false);

  // hydrate from storage on mount, falling back to the default layout
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.NAV_TABS);
        const parsed = raw ? sanitize(JSON.parse(raw)) : null;
        if (parsed) setNavTabsState(parsed);
      } catch {
        // keep default on any read/parse error
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const setNavTabs = useCallback((tabs: NavTabId[]) => {
    const clean = sanitize(tabs);
    if (!clean) return;
    setNavTabsState(clean);
    AsyncStorage.setItem(STORAGE_KEYS.NAV_TABS, JSON.stringify(clean)).catch(() => {});
  }, []);

  const resetNavTabs = useCallback(() => {
    setNavTabsState(DEFAULT_NAV_TABS);
    AsyncStorage.setItem(STORAGE_KEYS.NAV_TABS, JSON.stringify(DEFAULT_NAV_TABS)).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ navTabs, setNavTabs, resetNavTabs, loaded }),
    [navTabs, setNavTabs, resetNavTabs, loaded]
  );

  return <NavTabsContext.Provider value={value}>{children}</NavTabsContext.Provider>;
}

export function useNavTabs() {
  const context = useContext(NavTabsContext);
  if (!context) {
    throw new Error('useNavTabs must be used within NavTabsProvider');
  }
  return context;
}

// convenience: resolve the ids into full destinations for rendering
export function useNavDestinations() {
  const { navTabs } = useNavTabs();
  return navTabs.map(id => NAV_DESTINATIONS[id]);
}
