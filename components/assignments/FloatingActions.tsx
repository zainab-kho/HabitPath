import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import { router } from 'expo-router';

interface FloatingActionsProps {
    showSaveButton: boolean;
    showMoreMenu: boolean;
    isSaving: boolean;
    onSave: () => void;
    onCancel: () => void;
    onToggleMenu: () => void;
    onAddCourse: () => void;
    onAddWeek: () => void;
    onEdit: () => void;
    onAddAssignment: () => void;
    onCloseMenu: () => void;
}

export function FloatingActions({
    showSaveButton,
    showMoreMenu,
    isSaving,
    onSave,
    onCancel,
    onToggleMenu,
    onAddCourse,
    onAddWeek,
    onEdit,
    onAddAssignment,
    onCloseMenu,
}: FloatingActionsProps) {
    return (
        <>
            {/* full screen overlay for more menu */}
            {showMoreMenu && (
                <Pressable
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 10,
                    }}
                    onPress={onCloseMenu} // close when tapped outside
                >
                    {/* actual menu */}
                    <Pressable
                        style={{
                            position: 'absolute',
                            bottom: 60,
                            right: 50,
                            backgroundColor: '#fff',
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#000',
                            padding: 15,
                            gap: 12,
                            minWidth: 180,
                            shadowColor: '#000',
                            shadowOffset: { width: 1, height: 1 },
                            shadowOpacity: 1,
                            shadowRadius: 0,
                            justifyContent: 'center',
                        }}
                        onPress={(e) => e.stopPropagation()} // prevent closing when tapping menu
                    >
                        <Pressable onPress={onAddCourse}>
                            <View style={{ padding: 5, borderBottomWidth: 1 }}>
                                <Text style={globalStyles.body}>Add New Course</Text>
                            </View>
                        </Pressable>

                        <Pressable onPress={onAddWeek}>
                            <View style={{ padding: 5, borderBottomWidth: 1 }}>
                                <Text style={globalStyles.body}>Add New Week</Text>
                            </View>
                        </Pressable>

                        <Pressable onPress={() => router.push('/(tabs)/more/assignments/AllAssignments')}>
                            <View style={{ padding: 5, borderBottomWidth: 1 }}>
                                <Text style={globalStyles.body}>All Assignments</Text>
                            </View>
                        </Pressable>

                        <Pressable onPress={onEdit}>
                            <View style={{ paddingTop: 5, paddingHorizontal: 5 }}>
                                <Text style={globalStyles.body}>Edit</Text>
                            </View>
                        </Pressable>

                    </Pressable>
                </Pressable>
            )}

            {/* floating buttons */}
            <View style={{ position: 'absolute', bottom: 10, right: 0, zIndex: 5 }}>
                {!showSaveButton && (
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={onToggleMenu}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.assignments.primary[1]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                            >
                                <View
                                    style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                                >
                                    <Image source={SYSTEM_ICONS.more} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={onAddAssignment}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.assignments.primary[0]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                            >
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 25, textAlign: 'center' }}>+</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* save buttons */}
            {showSaveButton && (
                <View style={{ alignSelf: 'center', padding: 20 }}>
                    <View style={{ flexDirection: 'row', gap: 10, opacity: 1 }}>
                        <Pressable onPress={onCancel} disabled={isSaving}>
                            <ShadowBox contentBackgroundColor="#f0f0f0">
                                <View style={{ width: 150, paddingVertical: 6, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>Cancel</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>

                        <Pressable onPress={onSave} disabled={isSaving}>
                            <ShadowBox contentBackgroundColor={BUTTON_COLORS.Done}>
                                <View style={{ width: 150, paddingVertical: 6, alignItems: 'center' }}>
                                    <Text style={globalStyles.body}>{isSaving ? 'Saving...' : 'Save'}</Text>
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>
                </View>
            )}
        </>
    );
}