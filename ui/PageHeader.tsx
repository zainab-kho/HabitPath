import { useRouter } from 'expo-router'
import { Image, Pressable, Text, View } from 'react-native'

import { SYSTEM_ICONS } from '@/constants/icons'
import { globalStyles } from '@/styles'
import ShadowBox from '@/ui/ShadowBox'

interface PageHeaderProps {
  title: string
  showBackButton?: boolean
  showPlusButton?: boolean
  onPlusPress?: () => void
  plusNavigateTo?: string
  textColor?: string
}

export default function PageHeader({
  title,
  showBackButton = false,
  showPlusButton = false,
  onPlusPress,
  plusNavigateTo,
  textColor = 'black',
}: PageHeaderProps) {
  const router = useRouter()

  const handlePlusPress = () => {
    if (onPlusPress) onPlusPress()
    else if (plusNavigateTo) router.push(plusNavigateTo as any)
  }

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
      {/* left side: back button or spacer */}
      <View style={{ width: 40 }}>
        {showBackButton && (
          <Pressable
            onPress={() => router.back()}
            style={{ flexDirection: 'row', alignItems: 'center' }}
          >
            <Image
              source={SYSTEM_ICONS.sortLeft}
              style={{ width: 20, height: 20 }}
            />
          </Pressable>
        )}
      </View>

      {/* center: title */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={[ globalStyles.h1, {
            color: textColor,
          }]}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* right side: plus button or spacer */}
      <View style={{ width: 40, alignItems: 'flex-end' }}>
        {showPlusButton && (
          <Pressable onPress={handlePlusPress}>
            <ShadowBox
              borderRadius={10}
            >
              <Text style={{
                textAlign: 'center',
                fontFamily: 'p1',
                fontSize: 18,
                paddingVertical: 2,
                paddingHorizontal: 10,
              }}>+</Text>

            </ShadowBox>
          </Pressable>
        )}
      </View>
    </View>
  )
}