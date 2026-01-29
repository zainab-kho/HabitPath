// app/(tabs)/_layout.tsx
import { BottomNav } from '@/navigation/BottomNav';
import { getGradientForTime } from '@/utils/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={getGradientForTime()}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ flex: 1 }}
        pointerEvents="box-none"
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            contentStyle: { backgroundColor: 'transparent' },
            freezeOnBlur: false,
          }}
        >
          <Stack.Screen name="habits/index" />
          <Stack.Screen name="paths/index" />
          <Stack.Screen name="quests/index" />
          <Stack.Screen name="profile/index" />
        </Stack>
      </LinearGradient>
      
      <BottomNav />
    </View>
  );
}