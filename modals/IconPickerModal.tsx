// @/modals/IconPickerModal.tsx
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

import { COLORS } from '@/constants/colors';
import { HabitIcon, ICON_CATEGORIES } from '@/constants/icons';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

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
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        // activeOpacity={1}
      >
        <Pressable
          style={styles.modalContainer}
          onPress={(e) => e.stopPropagation()} // Prevent closing when tapping inside
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={globalStyles.h3}>Choose an Icon</Text>
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

          {/* Icon Grid - Horizontal Scroll */}
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
            {categories.map((category, catIndex) => {
              const icons = ICON_CATEGORIES[category];

              return (
                <View key={category} style={{ width: TAB_WIDTH }}>
                  {/* Vertical Scroll for icons in this category */}
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
                              contentBackgroundColor={
                                isSelected ? COLORS.Primary : '#fff'
                              }
                              contentBorderColor={
                                isSelected ? '#000' : COLORS.Primary
                              }
                              shadowColor={
                                isSelected ? '#000' : COLORS.Primary
                              }
                              shadowBorderColor={
                                isSelected ? '#000' : COLORS.Primary
                              }
                              borderRadius={15}
                              shadowOffset={{ x: 2, y: 2 }}
                            >
                              <View style={styles.iconButton}>
                                <Image
                                  source={icon.file}
                                  style={styles.iconImage}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.Primary,
    overflow: 'hidden',
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.Primary,
    borderRadius: 2,
  },

  horizontalScroll: {
    flex: 1,
  },

  iconGridContainer: {
    padding: 15,
    paddingBottom: 30,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'flex-start',
  },

  iconWrapper: {
    width: (TAB_WIDTH - 30 - 36) / 4, // 4 icons per row with gaps
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