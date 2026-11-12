import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { NewItemStyles } from '@/styles/NewItemStyles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

export default function NewMeal() {
    const { user } = useAuth();
    const router = useRouter();

    const inputRef = useRef<TextInput>(null);
    const scrollRef = useRef<ScrollView>(null);
    const scrollY = useRef(0);
    const scrollViewportHeight = useRef(0);

    const scrollToFocusedInput = () => {
        if (!scrollRef.current) return;
        scrollRef.current.scrollTo({ y: scrollY.current, animated: false });
    };

    // edit mode: opened from All Meals with the meal data prefilled
    const params = useLocalSearchParams<{ editId?: string; editData?: string }>();
    const isEditMode = !!params.editId;

    const [mealName, setMealName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const mealOptions = ['Breakfast', 'Lunch', 'Snack', 'Dinner', 'Dessert'];



    return (
        <AppLinearGradient variant={"mealPlan.background"}>
            <PageContainer>
                <PageHeader title={isEditMode ? 'Edit Meal' : 'New Meal'} showBackButton />
                {/* main card */}
                <View style={NewItemStyles.mainCardContainer}>
                    <ScrollView
                        ref={scrollRef}
                        contentContainerStyle={{ padding: 30, gap: 20 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        scrollEventThrottle={16}
                        onScroll={(e) => { scrollY.current = e.nativeEvent.contentOffset.y; }}
                        onLayout={(e) => {
                            scrollViewportHeight.current = e.nativeEvent.layout.height;
                            // the card just resized for the keyboard — keep the focused input visible
                            scrollToFocusedInput();
                        }}
                    >

                        <View style={{ marginBottom: 10 }}>
                            <Text style={[globalStyles.label, { marginBottom: 0 }]}>
                                MEAL NAME
                            </Text>

                            <TextInput
                                ref={inputRef}
                                style={[
                                    globalStyles.body,
                                    {
                                        flex: 1,
                                        borderBottomWidth: 1,
                                        borderBottomColor: PAGE.mealPlan.primary[0],
                                        paddingVertical: 10
                                    }
                                ]}
                                placeholder="Enter meal name..."
                                placeholderTextColor="rgba(0,0,0,0.4)"
                                value={mealName}
                                onChangeText={setMealName}
                                cursorColor={PAGE.mealPlan.primary[1]}
                                selectionColor={PAGE.mealPlan.primary[1]}
                            />
                        </View>

                        {/* What meal does this belong to? */}
                        <View style={{ marginBottom: 10 }}>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                                MEAL TYPE
                            </Text>

                            {/* **TODO: loop through the list of MealTimes and creates buttosn for each.
                                    user should be able to select multiple at a time. 
                                    User HAS to select one tho */}
                        </View>

                        {/* Can be null */}
                        <View style={{ marginBottom: 10 }}>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                                INGREDIENTS (OTIONAL)
                            </Text>

                            {/* **TODO: user should be able to add an ingredient easily
                                    the point of this is convenience.
                                    user types one ingredient, presses enter on the keyboard and
                                    immediately can start typing the next ingredient
                                    design: input box with list. background will be a simple light color background
                                    no border, and the input line. one at first, and when user presses enter, another line appears.
                                    if user taps away and there's nothing inputted in a line, the line deletes itself.
                                */}
                        </View>

                        {/* Can be null */}
                        <View style={{ marginBottom: 10 }}>
                            <Text style={[globalStyles.label, { marginBottom: 10 }]}>
                                RECIPE (OTIONAL)
                            </Text>

                            {/* **TODO: user can add a link to the recipe they're looking at.
                                    user writes down directions in a step by step format. nothing crazy. just a numbered list. 
                                    each number will be outlined in its own bubble.
                                */}
                        </View>

                    </ScrollView>


                    {/* cancel / (delete) / save — standard page button dimensions */}
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, backgroundColor: '#fff' }}>
                        <Pressable onPress={() => router.back()} style={{ flex: 1 }}>
                            <ShadowBox
                                contentBackgroundColor={BUTTON_COLORS.Cancel}
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        Cancel
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable
                            // onPress={handleSave}
                            style={{ flex: 1 }}
                            disabled={isSaving}
                        >
                            <ShadowBox
                                contentBackgroundColor={
                                    isSaving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save
                                }
                                shadowBorderRadius={15}
                            >
                                <View style={{ paddingVertical: 6 }}>
                                    <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </View>
            </PageContainer>
        </AppLinearGradient>
    );
}

const pickerModal = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.45)',
    },
    card: {
        maxHeight: '60%',
        width: '90%',
        alignSelf: 'center',
        borderWidth: 3,
        borderRadius: 20,
        borderColor: PAGE.assignments.primary[1],
        backgroundColor: '#fff',
    },
});