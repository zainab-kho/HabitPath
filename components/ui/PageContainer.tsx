// @/components/ui/PageContainer.tsx
import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

interface PageContainerProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>; // optional style prop
}

export default function PageContainer({ children, style }: PageContainerProps) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={[
          {
            flex: 1,
            marginTop: '15%',
            marginHorizontal: '5%',
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}