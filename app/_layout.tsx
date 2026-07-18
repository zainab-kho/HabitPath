// @/app/_layout.tsx
// Must be first: installs a secure random source (crypto.getRandomValues) that
// the journal encryption relies on. Nothing crypto-related may run before this.
import 'react-native-get-random-values';

import FeedbackButton from '@/components/FeedbackButton';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DrawerProvider } from '@/navigation/DrawerContext';
import { NavTabsProvider } from '@/navigation/NavTabsContext';
import { RootDrawer } from '@/navigation/RootDrawer';
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from 'react';
import { View } from 'react-native';

function RootLayoutNav() {
  const { user, loading, isPasswordRecovery } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // handle auth-based routing
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === 'auth';
    // the deep-link reset route is public — don't bounce to login before the
    // recovery session (set asynchronously from the URL tokens) is established
    const inRecoveryRoute = segments[0] === 'reset-password';

    if (isPasswordRecovery) {
      router.replace('/auth/ResetPassword');
      return;
    }

    if (!user && !inAuthGroup && !inRecoveryRoute) {
      router.replace('/auth/LoginScreen');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/habits');
    }
  }, [user, loading, segments, isPasswordRecovery]);

  // show loading screen while checking auth
  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }} />;
  }

  return (
    <NavTabsProvider>
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
            <Stack.Screen name="auth/ForgotPassword" />
            <Stack.Screen name="auth/ResetPassword" />
            <Stack.Screen name="reset-password" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>

          {/* global drawer */}
          <RootDrawer />

          {/* floating feedback tab on every page */}
          <FeedbackButton />
        </View>
      </DrawerProvider>
    </NavTabsProvider>
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