import { SYSTEM_ICONS } from '@/components/icons'
import { useRouter } from 'expo-router'
import { Image, Pressable, Text, View } from 'react-native'

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
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginBottom: 15,
      }}
    >
      {/* left side - back button or spacer */}
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

      {/* center - title */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 22,
            fontFamily: 'p2',
            color: textColor,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* right side - plus button or spacer */}
      <View style={{ width: 40, alignItems: 'flex-end' }}>
        {showPlusButton && (
          <Pressable onPress={handlePlusPress}>
            <Text
              style={{
                textAlign: 'center',
                width: 30,
                fontSize: 20,
                backgroundColor: '#fff',
                borderWidth: 1,
                borderRadius: 10,
                shadowColor: 'black',
                shadowOffset: { width: 2, height: 2 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 5,
                fontFamily: 'p2',
              }}
            >
              +
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}