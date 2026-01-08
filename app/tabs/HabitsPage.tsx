import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { getGradientForTime } from '@/components/utils/gradients';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

// **TODO: add linear gradient times (updated)

export default function HabitsPage() {
    const { signOut } = useAuth()

    // night mode detection (for text color)
    const currentHour = new Date().getHours();
    const isNightMode = currentHour >= 21 || currentHour < 5;
    const textColor = isNightMode ? 'white' : 'black';

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
                    plusNavigateTo='/tabs/HabitsPage'
                    textColor={textColor}
                ></PageHeader>


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
