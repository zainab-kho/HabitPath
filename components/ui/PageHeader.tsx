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
        paddingHorizontal: 12,
        marginBottom: 15,
      }}
    >
      {/* LEFT SLOT */}
      <View style={{ width: 40, alignItems: 'flex-start' }}>
        {showBackButton && (
          <Pressable onPress={() => router.back()}>
            <Image
              source={require('@/assets/icons/system/back.png')}
              style={{ width: 20, height: 20 }}
            />
          </Pressable>
        )}
      </View>

      {/* CENTER SLOT */}
      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 20,
            fontFamily: 'p1',
            color: textColor,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {/* RIGHT SLOT */}
      <View style={{ width: 40, alignItems: 'flex-end' }}>
        {showPlusButton && (
          <Pressable onPress={handlePlusPress}>
            <Text
              style={{
                textAlign: 'center',
                width: 40,
                fontSize: 24,
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