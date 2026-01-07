import { COLORS } from '@/components/colors';
import { useAuth } from '@/contexts/AuthContext';
import { buttonStyles, globalStyles } from '@/styles';
import { Pressable, Text, View } from "react-native";

export default function HabitsPage() {
    const { signOut } = useAuth()

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Text>Welcome!</Text>

            <Pressable
                onPress={signOut}
                style={[buttonStyles.button, { backgroundColor: COLORS.PrimaryLight, width: 150, alignSelf: 'center', margin: 100 }]}
            >
                <Text style={globalStyles.body}>Sign Out</Text>
            </Pressable>
    </View >
  );
}
