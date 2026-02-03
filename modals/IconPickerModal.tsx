import { COLORS, PAGE } from '@/constants/colors';
import { HabitIcon, ICON_CATEGORIES } from '@/constants/icons';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH - 60; // Account for modal padding

interface IconPickerModalProps {
    visible: boolean;
    selectedIcon: string;
    onClose: () => void;
    onSelectIcon: (iconName: string) => void;
}

export default function IconPickerModal({
    visible,
    selectedIcon,
    onClose,
    onSelectIcon,
}: IconPickerModalProps) {
    const categories = Object.keys(ICON_CATEGORIES);
    const [activeTab, setActiveTab] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        scrollViewRef.current?.scrollTo({ x: index * TAB_WIDTH, animated: true });
    };

    const handleIconSelect = (iconName: string) => {
        onSelectIcon(iconName);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <Pressable style={styles.overlay} onPress={onClose}>
                <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={globalStyles.h2}>Choose an Icon</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Text style={[globalStyles.body, { fontSize: 24 }]}>×</Text>
                        </Pressable>
                    </View>

                    {/* Tab Headers */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tabHeadersContainer}
                    >
                        {categories.map((category, index) => (
                            <Pressable
                                key={category}
                                onPress={() => handleTabPress(index)}
                                style={styles.tabHeader}
                            >
                                <Text
                                    style={[
                                        globalStyles.body2,
                                        styles.tabHeaderText,
                                        activeTab === index && styles.tabHeaderTextActive,
                                    ]}
                                >
                                    {category}
                                </Text>
                                {activeTab === index && <View style={styles.tabIndicator} />}
                            </Pressable>
                        ))}
                    </ScrollView>

                    {/* Horizontal Scroll of Categories */}
                    <ScrollView
                        ref={scrollViewRef}
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onMomentumScrollEnd={(e) => {
                            const offsetX = e.nativeEvent.contentOffset.x;
                            const index = Math.round(offsetX / TAB_WIDTH);
                            setActiveTab(index);
                        }}
                        style={styles.horizontalScroll}
                    >
                        {categories.map((category) => {
                            const icons = ICON_CATEGORIES[category];

                            return (
                                <View key={category} style={{ width: TAB_WIDTH, flex: 1 }}>
                                    <ScrollView
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={styles.iconGridContainer}
                                    >
                                        <View style={styles.iconGrid}>
                                            {icons.map((icon: HabitIcon) => {
                                                const isSelected = selectedIcon === icon.name;

                                                return (
                                                    <Pressable
                                                        key={icon.name}
                                                        onPress={() => handleIconSelect(icon.name)}
                                                        style={styles.iconWrapper}
                                                    >
                                                        <ShadowBox
                                                            contentBackgroundColor={isSelected ? COLORS.Primary : '#fff'}
                                                            contentBorderColor={isSelected ? '#000' : COLORS.Primary}
                                                            shadowColor={isSelected ? '#000' : COLORS.Primary}
                                                            shadowBorderColor={isSelected ? '#000' : COLORS.Primary}
                                                            shadowBorderRadius={15}
                                                            shadowOffset={{ x: 2, y: 2 }}
                                                        >
                                                            <View style={styles.iconButton}>
                                                                <Image
                                                                    source={icon.file}
                                                                    style={styles.iconImage}
                                                                    onError={(e) =>
                                                                        console.log('IMG ERROR', icon.name, e.nativeEvent)
                                                                    }
                                                                />
                                                            </View>
                                                        </ShadowBox>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </ScrollView>
                                </View>
                            );
                        })}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalContainer: {
        alignContent: 'center',
        width: '90%',
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: PAGE.habits.border[0]
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },

    closeButton: {
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },

    tabHeadersContainer: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        gap: 20,
    },

    tabHeader: {
        paddingBottom: 5,
    },

    tabHeaderText: {
        fontSize: 14,
        opacity: 0.5,
    },

    tabHeaderTextActive: {
        opacity: 1,
        fontFamily: 'p1',
    },

    tabIndicator: {
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: COLORS.Primary,
        borderRadius: 2,
    },

    horizontalScroll: {
        margin: 10,

    },

    iconGridContainer: {
        paddingBottom: 30,

    },

    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center'
    },

    iconWrapper: {
        width: (TAB_WIDTH - 30 - 36) / 4, // 4 icons per row
        aspectRatio: 1,

    },

    iconButton: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },

    iconImage: {
        width: '70%',
        height: '70%',
        resizeMode: 'contain',
    },
});