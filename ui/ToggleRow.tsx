// @/ui/ToggleRow.tsx
import React from 'react';
import { Switch, Text, View, ViewStyle } from 'react-native';

import { globalStyles } from '@/styles';

type ToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;

  // optional customization
  trackColorTrue?: string;
  disabled?: boolean;
  style?: ViewStyle;
  description?: string;
};

export default function ToggleRow({
  label,
  value,
  onValueChange,
  trackColorTrue,
  disabled = false,
  style,
  description,
}: ToggleRowProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        },
        style,
      ]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={globalStyles.body}>{label}</Text>
        {!!description && (
          <Text style={[globalStyles.label, { opacity: 0.7, marginTop: 2 }]}>
            {description}
          </Text>
        )}
      </View>

      <Switch
        disabled={disabled}
        trackColor={trackColorTrue ? { true: trackColorTrue } : undefined}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
}