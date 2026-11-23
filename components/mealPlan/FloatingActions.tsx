// @/components/mealPlan/FloatingActions.tsx
import React from 'react';
import { Image, ImageSourcePropType, Pressable, View } from 'react-native';

import { PAGE } from '@/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';

interface FloatingActionsProps {
    onOpenMeals: () => void;
    onOpenGrocery: () => void;
    onAddMeal: () => void;
    fromDrawer?: boolean;
}

function RoundButton({ icon, color, onPress }: { icon: ImageSourcePropType; color: string; onPress: () => void }) {
    return (
        <Pressable onPress={onPress}>
            <ShadowBox
                contentBackgroundColor={color}
                contentBorderRadius={30}
                shadowBorderRadius={30}
                shadowOffset={{ x: 1, y: 1 }}
            >
                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                    <Image source={icon} style={{ width: 20, height: 20 }} />
                </View>
            </ShadowBox>
        </Pressable>
    );
}

// the three round buttons in the corner of the meal plan page:
// manage meals, grocery list, and new meal
export function FloatingActions({ onOpenMeals, onOpenGrocery, onAddMeal, fromDrawer = false }: FloatingActionsProps) {
    return (
        <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <RoundButton icon={SYSTEM_ICONS.more} color={PAGE.mealPlan.primary[2]} onPress={onOpenMeals} />
                <RoundButton icon={SYSTEM_ICONS.shoppingCart} color={PAGE.mealPlan.primary[1]} onPress={onOpenGrocery} />
                <RoundButton icon={SYSTEM_ICONS.plus} color={PAGE.mealPlan.primary[0]} onPress={onAddMeal} />
            </View>
        </View>
    );
}
