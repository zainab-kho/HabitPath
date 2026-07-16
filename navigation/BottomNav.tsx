// @/navigation/BottomNav.tsx
import { COLORS } from '@/constants/colors';
import { FIXED_TAB, NAV_DESTINATIONS } from '@/constants/navTabs';
import { useNavTabs } from '@/navigation/NavTabsContext';
import { usePathname, useRouter } from 'expo-router';
import { Image, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { navTabs } = useNavTabs();

    // slot 1 is always Habits; slots 2–4 come from the user's config.
    // `match` is what usePathname reports (route groups like "(tabs)" are stripped)
    const tabs = [NAV_DESTINATIONS[FIXED_TAB], ...navTabs.map(id => NAV_DESTINATIONS[id])];

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
                        key={tab.id}
                        onPress={() => router.replace(tab.route as any)}
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