// @/components/ui/PageContainer.tsx
import { BottomNav } from '@/navigation/BottomNav';
import { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';

interface PageContainerProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  showBottomNav?: boolean;
}

export default function PageContainer({
  children,
  style,
  showBottomNav = false,
}: PageContainerProps) {
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
      
      {showBottomNav && <BottomNav />}
    </View>
  );
}