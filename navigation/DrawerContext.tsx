// @/navigation/DrawerContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';

interface DrawerContextType {
    open: boolean;
    translateX: Animated.Value;
    openDrawer: () => void;
    closeDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

const DRAWER_WIDTH = 230;

export function DrawerProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const translateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

    const openDrawer = useCallback(() => {
        setOpen(true);
        Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 40,
            friction: 10,
        }).start();
    }, [translateX]);

    const closeDrawer = useCallback(() => {
        Animated.timing(translateX, {
            toValue: DRAWER_WIDTH,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            // set open to false after animation completes
            setOpen(false);
        });
    }, [translateX]);

    const value = useMemo(
        () => ({ open, translateX, openDrawer, closeDrawer }),
        [open, translateX, openDrawer, closeDrawer]
    );

    return (
        <DrawerContext.Provider value={value}>
            {children}
        </DrawerContext.Provider>
    );
}

export function useDrawer() {
    const context = useContext(DrawerContext);
    if (!context) {
        throw new Error('useDrawer must be used within DrawerProvider');
    }
    return context;
}