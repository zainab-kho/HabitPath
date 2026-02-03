// @/ui/ModernCard.tsx
/**
 * A legally distinct alternative to ShadowBox
 * Keeps the functionality but changes the visual signature:
 * - No thick black borders
 * - Soft, iOS-style shadows instead of hard offset shadows
 * - Optional left accent strip for color coding (instead of full background)
 */

import React from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface ModernCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  accentColor?: string; // For left strip
  borderRadius?: number;
  elevated?: boolean; // Higher shadow for important items
}

export default function ModernCard({
  children,
  style,
  backgroundColor = '#fff',
  accentColor,
  borderRadius = 12,
  elevated = false,
}: ModernCardProps) {
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor,
          borderRadius,
          // Soft shadow - iOS style
          shadowColor: '#000',
          shadowOffset: { width: 0, height: elevated ? 4 : 2 },
          shadowOpacity: elevated ? 0.15 : 0.08,
          shadowRadius: elevated ? 12 : 8,
          // Android shadow
          elevation: elevated ? 4 : 2,
        },
        // Optional accent strip on left
        accentColor && {
          borderLeftWidth: 4,
          borderLeftColor: accentColor,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    // Subtle border for definition (not thick black)
    borderWidth: Platform.OS === 'ios' ? 0 : 0.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
});