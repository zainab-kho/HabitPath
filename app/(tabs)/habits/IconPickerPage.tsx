import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, PAGE } from '@/constants/colors';
import { HabitIcon, ICON_CATEGORIES } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
    Text,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = SCREEN_WIDTH * 0.9;

export default function IconPickerPage() {
    const router = useRouter();
    const categories = Object.keys(ICON_CATEGORIES);
    const [activeTab, setActiveTab] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);

    const handleTabPress = (index: number) => {
        setActiveTab(index);
        scrollViewRef.current?.scrollTo({ x: index * TAB_WIDTH, animated: true });
    };

    const handleIconSelect = async (iconName: string) => {
        await AsyncStorage.setItem('pickedIcon', iconName);
        router.back();
    };

    return (
        <AppLinearGradient variant="newHabit.background">
            <PageContainer>
                <PageHeader title="Choose an Icon" showBackButton />

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tabButtons}
                    style={{ flexGrow: 0 }}
                >
                    {categories.map((category, index) => (
                        <Pressable
                            key={category}
                            onPress={() => handleTabPress(index)}
                            style={styles.tabButton}
                        >
                            <Text style={[
                                globalStyles.body,
                                styles.tabText,
                                { opacity: activeTab === index ? 1 : 0.4 },
                            ]}>
                                {category}
                            </Text>
                        </Pressable>
                    ))}
                </ScrollView>

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
                    style={{ flex: 1 }}
                >
                    {categories.map((category) => {
                        const icons = ICON_CATEGORIES[category]!;
                        return (
                            <View key={category} style={{ width: TAB_WIDTH }}>
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.iconGridContainer}
                                >
                                    <View style={styles.iconGrid}>
                                        {icons.map((icon: HabitIcon) => (
                                            <Pressable
                                                key={icon.name}
                                                onPress={() => handleIconSelect(icon.name)}
                                                style={styles.iconWrapper}
                                            >
                                                <ShadowBox
                                                    contentBorderColor={PAGE.habits.primary[1]}
                                                    shadowColor={PAGE.habits.primary[1]}
                                                    shadowBorderColor={PAGE.habits.primary[1]}
                                                    shadowBorderRadius={15}
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
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                        );
                    })}
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    tabButtons: {
        paddingHorizontal: 5,
        paddingTop: 5,
        paddingBottom: 10,
        gap: 20,
    },
    tabButton: {},
    tabText: {},
    iconGridContainer: {
        paddingTop: 5,
        paddingBottom: 50,
    },
    iconGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    iconWrapper: {
        width: '25%',
        aspectRatio: 1,
        padding: 8,
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
