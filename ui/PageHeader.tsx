import { useDrawer } from '@/navigation/DrawerContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';

import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  showPlusButton?: boolean; // (this is basically "show right button" in your current usage)
  onPlusPress?: () => void;
  navigateIcon?: ImageSourcePropType;   // ✅ fixed
  onNavigatePress?: () => void;         // ✅ added
  plusNavigateTo?: string;
  textColor?: string;
}

export default function PageHeader({
  title,
  showBackButton = false,
  showPlusButton = false,
  onPlusPress,
  navigateIcon,
  onNavigatePress,
  plusNavigateTo,
  textColor = 'black',
}: PageHeaderProps) {
  const router = useRouter();
  const { openDrawer } = useDrawer();

  const handlePlusPress = () => {
    if (onPlusPress) onPlusPress();
    else if (plusNavigateTo) router.push(plusNavigateTo as any);
  };

  const handleNavigatePress = () => {
    if (onNavigatePress) onNavigatePress();
    else openDrawer();
  };

  return (
    <View
      style={{
        height: 40,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 15,
      }}
    >
      {/* left side */}
      <View style={{ width: 40 }}>
        {showBackButton && (
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Image source={SYSTEM_ICONS.sortLeft} style={{ width: 20, height: 20 }} />
          </Pressable>
        )}
      </View>

      {/* center */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={[globalStyles.h1, { color: textColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* right side */}
      <View style={{ width: 40, alignItems: 'flex-end' }}>
        {showPlusButton && (
          <Pressable
            style={{ width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' }}
            onPress={onPlusPress || plusNavigateTo ? handlePlusPress : handleNavigatePress}
          >
            <Image
              source={navigateIcon ?? SYSTEM_ICONS.more}
              style={{ width: 20, height: 20 }}
              tintColor="rgba(0,0,0,0.7)"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}