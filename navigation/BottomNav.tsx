// @/navigation/BottomNav.tsx
import { COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useDrawer } from '@/navigation/DrawerContext';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { openDrawer } = useDrawer();

    // `match` is what usePathname reports (route groups like "(tabs)" are stripped)
    const tabs = [
        {
            name: 'habits',
            route: '/habits',
            match: '/habits',
            icon: SYSTEM_ICONS.habit,
        },
        {
            name: 'paths',
            route: '/paths',
            match: '/paths',
            icon: SYSTEM_ICONS.path,
        },
        {
            name: 'assignments',
            route: '/(tabs)/more/assignments',
            match: '/more/assignments',
            icon: SYSTEM_ICONS.assignment,
        },
        {
            name: 'quests',
            route: '/quests',
            match: '/quests',
            icon: SYSTEM_ICONS.quest,
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
                const isActive = pathname === tab.match || pathname.startsWith(tab.match + '/');

                return (
                    <Pressable
                        key={tab.name}
                        onPress={() => {
                            if (tab.name === 'more') {
                                openDrawer();
                            } else {
                                router.replace(tab.route as any);
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