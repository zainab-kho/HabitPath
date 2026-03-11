// app/(tabs)/_layout.tsx
import 'react-native-gesture-handler';
import { getGradientForTime } from '@/utils/gradients';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import * as Updates from 'expo-updates';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

console.log('updates enabled?', Updates.isEnabled);
console.log('updateId', Updates.updateId);
console.log('runtimeVersion', Updates.runtimeVersion);
console.log('channel', Updates.channel);
console.log('createdAt', Updates.createdAt);

export default function TabsLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
      </View>
    </GestureHandlerRootView>
  );
}