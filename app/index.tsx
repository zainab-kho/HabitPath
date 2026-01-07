// @/app/index.tsx
import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { View } from 'react-native';

export default function Index() {
  const { user, loading } = useAuth();

  // show loading while checking auth state
  if (loading) {
    return <View style={{ flex: 1, backgroundColor: 'transparent' }} />;
  }

  // not logged in, send to login screen
  if (!user) {
    return <Redirect href="/auth/LoginScreen" />;
  }

  // logged in, send to main habits page
  return <Redirect href="/tabs/HabitsPage" />;
}