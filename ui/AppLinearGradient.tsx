// app/components/gradients/AppLinearGradient.tsx
import { PAGE } from '@/constants/colors';
import { layoutStyles } from '@/styles';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, ViewStyle } from 'react-native';

type GradientPath =
  | 'auth.background'
  | 'habitsPage.background'
  | 'newHabit.background'
  | 'path.background'
  | 'quest.background'
  | 'profile.background'
  | 'journal.background'
  | 'focus.backgroundMain'
  | 'focus.backgroundBreak'
  | 'assignments.background'
  | 'assignments.backgroundAssignment'
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