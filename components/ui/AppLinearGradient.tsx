// app/components/gradients/AppLinearGradient.tsx
import { PAGE } from '@/components/colors';
import { layoutStyles } from '@/styles';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';

type GradientPath =
  | 'auth.background'
  | 'habitsPage.background'
  | 'journal.background'
  | 'settings.background';

interface Props {
  variant: GradientPath;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function getGradient(path: GradientPath) {
  return path.split('.').reduce<any>((acc, key) => acc[key], PAGE);
}

export function AppLinearGradient({ variant, children, style }: Props) {
  return (
    <LinearGradient
      colors={getGradient(variant)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[layoutStyles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}