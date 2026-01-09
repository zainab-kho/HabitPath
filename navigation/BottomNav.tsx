// @/navigation/BottomNav.tsx
import { COLORS } from '@/components/colors';
import { SYSTEM_ICONS } from '@/components/icons';
import { useDrawer } from '@/navigation/DrawerContext';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { openDrawer } = useDrawer();

    // hide bottom nav on certain screens
    const shouldHide = pathname.includes('/more/') || pathname.includes('/auth/');

    if (shouldHide) return null;

    const tabs = [
        {
            name: 'habits',
            route: '/habits',
            icon: SYSTEM_ICONS.habit,
        },
        {
            name: 'paths',
            route: '/paths',
            icon: SYSTEM_ICONS.path,
        },
        {
            name: 'quests',
            route: '/quests',
            icon: SYSTEM_ICONS.quest,
        },
        {
            name: 'profile',
            route: '/(tabs)/profile',
            icon: SYSTEM_ICONS.profile,
        },
        {
            name: 'more',
            route: '/',
            icon: SYSTEM_ICONS.more,
        },
    ];

    return (
        <View
            style={{
                height: 100,
                bottom: 0,
                left: 0,
                right: 0,
                paddingBottom: insets.bottom,
                paddingTop: 10,
                flexDirection: 'row',
                justifyContent: 'space-around',
                borderTopWidth: 1,
                borderTopColor: '#000',
                backgroundColor: '#fff',
            }}
        >
            {tabs.map((tab) => {
                const isActive = pathname === tab.route;

                return (
                    <Pressable
                        key={tab.name}
                        onPress={() => {
                            if (tab.name === 'more') {
                                openDrawer();
                            } else {
                                router.push(tab.route as any);
                            }
                        }}
                        style={({ pressed }) => ({
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: 8,
                            opacity: pressed ? 0.6 : 1,
                        })}
                    >
                        <Image
                            source={tab.icon}
                            style={{
                                width: 30,
                                height: 30,
                            }}
                            tintColor={isActive ? COLORS.Primary : '#999'}
                        />
                    </Pressable>
                );
            })}
        </View>
    );
}