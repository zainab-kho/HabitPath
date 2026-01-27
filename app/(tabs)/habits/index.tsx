// @/app/(tabs)/habits/index
import { formatDateHeader } from '@/components/utils/date';
import { getGradientForTime } from '@/components/utils/gradients';
import { COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import NewHabitModal from '@/modals/NewHabit';
import { globalStyles } from '@/styles';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

// **TODO: add linear gradient times (updated)

export default function HabitsPage() {
    const { signOut } = useAuth()
    const isFocused = useIsFocused();
    const viewingDateRef = useRef<Date | null>(null);

    // ============================================================================
    // STATE
    // ============================================================================
    const [habits, setHabits] = useState();
    const [viewingDate, setViewingDate] = useState<Date | null>(null);
    const [showNewHabitModal, setShowNewHabitModal] = useState(false);


    viewingDateRef.current = viewingDate;


    // night mode detection (for text color)
    const currentHour = new Date().getHours();
    const isNightMode = currentHour >= 21 || currentHour < 5;
    const textColor = isNightMode ? 'white' : 'black';

    // **TODO: 
    // // load data once + keep it cached
    // useEffect(() => {
    //     // loadHabits();
    //     console.log('loading habits');
    // }, []);

    // // refresh only when needed
    // useEffect(() => {
    //     if (isFocused)
    //         console.log('it is focused');
    // })

    // const isToday = (date: Date | null) => {
    //     if (!date) return false;
    //     const todayHabitStr = getHabitDate(new Date(), resetTime.hour, resetTime.minute);
    //     const viewingHabitStr = getHabitDate(date, resetTime.hour, resetTime.minute);
    //     return todayHabitStr === viewingHabitStr;
    // };

    const navigateDate = (direction: 'prev' | 'next') => {
        if (!viewingDate) return;
        const newDate = new Date(viewingDate);
        newDate.setDate(newDate.getDate() + (direction === 'prev' ? -1 : 1));
        setViewingDate(newDate);
    };

    return (
        <LinearGradient
            colors={getGradientForTime()}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ flex: 1 }}
        >
            <PageContainer>
                <PageHeader
                    title='Habits'
                    showPlusButton
                    onPlusPress={() => setShowNewHabitModal(true)}
                    textColor={textColor}
                ></PageHeader>

                {/* date navigator */}
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                    }}
                >
                    <Pressable onPress={() => navigateDate('prev')} style={{ padding: 5 }}>
                        <Image
                            source={SYSTEM_ICONS.sortLeft}
                            style={{
                                width: 20,
                                height: 20,
                                // **UNCOMMENT: tintColor: isToday(viewingDate) ? textColor : `${COLORS.Primary}ff`,
                            }}
                        />
                    </Pressable>

                    <Pressable
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: '#000',
                            backgroundColor: COLORS.PrimaryLight,
                        }}
                    // **UNCOMMENT: onPress={() => setViewingDate(getCurrentHabitDay())}
                    >
                        <Text
                            style={[
                                globalStyles.body2,
                                {
                                    // **UNCOMMENT: color: isToday(viewingDate) ? textColor : `${COLORS.Primary}ff`,
                                    fontSize: 13,
                                },
                            ]}
                        >
                            {/* **UNCOMMENT: {formatDateHeader(viewingDate)} */}
                            {formatDateHeader(new Date())}
                        </Text>
                    </Pressable>

                    <Pressable onPress={() => navigateDate('next')} style={{ padding: 5 }}>
                        <Image
                            source={SYSTEM_ICONS.sortRight}
                            style={{
                                width: 20,
                                height: 20,
                                // **UNCOMMENT: tintColor: isToday(viewingDate) ? textColor : `${COLORS.Primary}ff`,
                            }}
                        />
                    </Pressable>
                </View>

                <NewHabitModal
                    visible={showNewHabitModal}
                    onClose={() => setShowNewHabitModal(false)}
                    onSave={() => setShowNewHabitModal(false)}
                />
            </PageContainer>



            {/* **TESTING: move to settings page when created */}
            {/* <Pressable
                    onPress={signOut}
                    style={[buttonStyles.button, { backgroundColor: COLORS.PrimaryLight, width: 150, alignSelf: 'center', margin: 100 }]}
                >
                    <Text style={globalStyles.body}>Sign Out</Text>
                </Pressable> */}
        </LinearGradient>
    );
}

const modalStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingBottom: 40 },
    container: {
        width: '90%',
        height: '60%',
    },
});
