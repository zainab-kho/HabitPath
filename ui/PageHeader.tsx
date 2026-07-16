import { useDrawer } from '@/navigation/DrawerContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ImageSourcePropType, Pressable, Text, View } from 'react-native';

import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';

interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  // **TODO: change to 'showRightButton' and 'onRightPress' for more generic usage across the app**
  showPlusButton?: boolean;
  onPlusPress?: () => void;
  navigateIcon?: ImageSourcePropType;  
  onNavigatePress?: () => void; 
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

  // custom right-side action (an "add" plus, or a page-specific icon like the
  // journal lock). the drawer is handled by the separate More button below.
  const handleActionPress = () => {
    if (onPlusPress) onPlusPress();
    else if (plusNavigateTo) router.push(plusNavigateTo as any);
    else if (onNavigatePress) onNavigatePress();
  };

  const showActionButton = showPlusButton || !!navigateIcon;
  // the More button opens the side drawer. it sits on the far right of every
  // top-level (bottom-nav) page — i.e. whenever there's no back button.
  const showMoreButton = !showBackButton;

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

      {/* right side: [custom action] [More] — More is always rightmost */}
      <View style={{ minWidth: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
        {showActionButton && (
          <Pressable
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            onPress={handleActionPress}
          >
            <Image
              source={navigateIcon ?? SYSTEM_ICONS.plus}
              style={{ width: 20, height: 20 }}
              tintColor="rgba(0,0,0,0.7)"
            />
          </Pressable>
        )}

        {showMoreButton && (
          <Pressable
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
            onPress={openDrawer}
          >
            <Image
              source={SYSTEM_ICONS.more}
              style={{ width: 20, height: 20 }}
              tintColor="rgba(0,0,0,0.7)"
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}