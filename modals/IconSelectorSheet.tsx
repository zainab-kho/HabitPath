// @/components/modals/IconSelectorSheet.tsx
import React, { useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';

import { COLORS } from '@/constants/colors';
import { HabitIcon, ICON_CATEGORIES } from '@/constants/icons';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ICON_SIZE = (SCREEN_WIDTH - 80) / 4; // 4 icons per row with padding

interface IconSelectorSheetProps {
    visible: boolean;
    onClose: () => void;
    onSelectIcon: (iconName: string, iconFile: any) => void;
    currentIcon?: string;
}

export default function IconSelectorSheet({
    visible,
    onClose,
    onSelectIcon,
    currentIcon,
}: IconSelectorSheetProps) {
    const categories = Object.keys(ICON_CATEGORIES);
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    const handleSelectIcon = (icon: HabitIcon) => {
        onSelectIcon(icon.name, icon.file);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <Pressable
                style={styles.backdrop}
                onPress={onClose}
            >
                {/* Sheet Container */}
                <Pressable
                    style={styles.sheetContainer}
                    onPress={(e) => e.stopPropagation()}
                >
                    {/* Drag Handle */}
                    <View style={styles.dragHandle} />

                    {/* Header */}
                    <Text style={[globalStyles.h3, styles.title]}>
                        Choose an Icon
                    </Text>

                    {/* Category Tabs */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryTabsContainer}
                        contentContainerStyle={styles.categoryTabsContent}
                    >
                        {categories.map((category) => (
                            <Pressable
                                key={category}
                                onPress={() => setActiveCategory(category)}
                                style={[
                                    styles.categoryTab,
                                    activeCategory === category && styles.categoryTabActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.categoryTabText,
                                        activeCategory === category && styles.categoryTabTextActive,
                                    ]}
                                >
                                    {category}
                                </Text>
                            </Pressable>
                        ))}
                    </ScrollView>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={{
                            height: 300
                        }}>
                        <View>
                            <View style={styles.iconsContainer}>
                                {ICON_CATEGORIES[activeCategory].map((icon, index) => {
                                    const isSelected = currentIcon === icon.name;

                                    return (
                                        <Pressable
                                            key={`${icon.name}-${index}`}
                                            onPress={() => handleSelectIcon(icon)}
                                            style={styles.iconWrapper}
                                        >
                                            <ShadowBox
                                                contentBackgroundColor={isSelected ? COLORS.Primary : '#fff'}
                                                borderRadius={16}
                                                shadowOffset={{ x: 2, y: 2 }}
                                                shadowColor={isSelected ? COLORS.Primary : '#000'}
                                            >
                                                <View style={styles.iconButton}>
                                                    <Image
                                                        source={icon.file}
                                                        style={styles.iconImage}
                                                        resizeMode="contain"
                                                    />
                                                </View>
                                            </ShadowBox>
                                        </Pressable>
                                    );
                                })}
                            </View>


                        </View>
                    </ScrollView>

                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },

    sheetContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 40,
        maxHeight: '80%',
    },

    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#ccc',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },

    title: {
        textAlign: 'center',
        marginBottom: 20,
    },

    categoryTabsContainer: {
        marginBottom: 20,
        maxHeight: 40,
    },

    categoryTabsContent: {
        gap: 8,
        paddingHorizontal: 4,
    },

    categoryTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },

    categoryTabActive: {
        backgroundColor: COLORS.Primary,
        borderColor: '#000',
    },

    categoryTabText: {
        fontSize: 13,
        fontFamily: 'body',
        color: '#666',
    },

    categoryTabTextActive: {
        color: '#000',
        fontWeight: '600',
    },

    iconsScrollView: {
        flex: 1,
        height: 500
    },

    iconsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 8,
        padding: 3,
    },

    iconWrapper: {
        // width: ICON_SIZE,
        // height: ICON_SIZE,
        width: 70,
        height: 70,
        marginBottom: 12,
    },

    iconButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },

    iconImage: {
        width: 50,
        height: 50,
    },

    iconImageSelected: {
        opacity: 0.8,
    },
});