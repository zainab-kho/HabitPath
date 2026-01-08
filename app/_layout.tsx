// @/app/_layout.tsx
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DrawerProvider } from '@/navigation/DrawerContext';
import { RootDrawer } from '@/navigation/RootDrawer';
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from 'react';
import { View } from 'react-native';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // handle auth-based routing
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // not logged in, redirect to login
      router.replace('/auth/LoginScreen');
    } else if (user && inAuthGroup) {
      // logged in but on auth screen, redirect to app
      router.replace('/(tabs)/habits');
    }
  }, [user, loading, segments]);

  // show loading screen while checking auth
  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  return (
    <DrawerProvider>
      <View style={{ flex: 1 }} pointerEvents="box-none">
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
            gestureEnabled: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/LoginScreen" />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>

        {/* global drawer */}
        <RootDrawer />
      </View>
    </DrawerProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    p1: require('@/assets/fonts/Apercu/apercu_bold_pro.otf'),
    p2: require('@/assets/fonts/Apercu/apercu_medium_pro.otf'),
    p3: require('@/assets/fonts/Apercu/apercu_regular_pro.otf'),
    label: require('@/assets/fonts/Inter/Inter-Medium.otf'),
  });

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}