import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { router } from 'expo-router';

interface FloatingActionsProps {
    showMoreMenu: boolean;
    onToggleMenu: () => void;
    onAddMeal: () => void;
    fromDrawer?: boolean;
}

export function FloatingActions({
    // showSaveButton,
    fromDrawer = false,
    onToggleMenu,
    onAddMeal,
}: FloatingActionsProps) {
    return (
        <>
            {/* floating buttons */}
            <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
                {/* {!showSaveButton && ( */}
                <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                    <Pressable onPress={onToggleMenu}>
                        <ShadowBox
                            contentBackgroundColor={PAGE.mealPlan.primary[2]}
                            contentBorderRadius={30}
                            shadowBorderRadius={30}
                            shadowOffset={{ x: 1, y: 1 }}
                        >
                            <View
                                style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                            >
                                <Image source={SYSTEM_ICONS.more} style={{ width: 20, height: 20 }} />
                            </View>
                        </ShadowBox>
                    </Pressable>

                    <Pressable onPress={onAddMeal}>
                        <ShadowBox
                            contentBackgroundColor={PAGE.mealPlan.primary[1]}
                            contentBorderRadius={30}
                            shadowBorderRadius={30}
                            shadowOffset={{ x: 1, y: 1 }}
                        >
                            <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                <Image source={SYSTEM_ICONS.shoppingCart} style={{ width: 20, height: 20 }} />
                            </View>
                        </ShadowBox>
                    </Pressable>

                    <Pressable onPress={onAddMeal}>
                        <ShadowBox
                            contentBackgroundColor={PAGE.mealPlan.primary[0]}
                            contentBorderRadius={30}
                            shadowBorderRadius={30}
                            shadowOffset={{ x: 1, y: 1 }}
                        >
                            <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                <Image source={SYSTEM_ICONS.plus} style={{ width: 20, height: 20 }} />
                            </View>
                        </ShadowBox>
                    </Pressable>
                </View>
                {/* )} */}
            </View>
        </>
    );
}