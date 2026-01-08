// @/navigation/RootDrawer.tsx
import { SYSTEM_ICONS } from '@/components/icons';
import { useDrawer } from '@/navigation/DrawerContext';
import { globalStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { useRef } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    Pressable,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DRAWER_WIDTH = 230;

export function RootDrawer() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { open, translateX, openDrawer, closeDrawer } = useDrawer();

    // full-screen pan responder for edge detection (when closed)
    const edgePanResponder = useRef(
        PanResponder.create({
            // don't capture on touch start
            onStartShouldSetPanResponder: () => false,

            // only capture on move if it's a swipe from the edge
            onMoveShouldSetPanResponder: (evt, g) => {
                const touchX = evt.nativeEvent.pageX;
                const touchY = evt.nativeEvent.pageY;

                // only trigger from right 50px of screen
                const inEdgeZone = touchX > SCREEN_WIDTH - 50;

                // must be swiping left
                const swipingLeft = g.dx < -15;

                // must be more horizontal than vertical (prevents conflict with scrolling)
                const moreHorizontal = Math.abs(g.dx) > Math.abs(g.dy) * 2;

                // must have some velocity to feel intentional
                const hasVelocity = Math.abs(g.vx) > 0.1;

                return inEdgeZone && swipingLeft && moreHorizontal && hasVelocity;
            },

            onStartShouldSetPanResponderCapture: () => false,
            onMoveShouldSetPanResponderCapture: () => false,

            onPanResponderGrant: () => {
                translateX.setValue(DRAWER_WIDTH);
            },

            onPanResponderMove: (_, g) => {
                // Smoother tracking as you swipe
                const value = Math.max(0, Math.min(DRAWER_WIDTH, DRAWER_WIDTH + g.dx));
                translateX.setValue(value);
            },

            onPanResponderRelease: (_, g) => {
                const threshold = DRAWER_WIDTH / 3;
                const velocity = g.vx;

                // Fast swipe or past threshold = open
                if (velocity < -0.5 || -g.dx > threshold) {
                    openDrawer();
                } else {
                    closeDrawer();
                }
            },
        })
    ).current;

    // pan responder for the drawer itself (when open)
    const drawerPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10,

            onPanResponderGrant: () => {
                translateX.stopAnimation();
            },

            onPanResponderMove: (_, g) => {
                // Only allow swiping right to close
                if (g.dx > 0) {
                    const value = Math.max(0, Math.min(DRAWER_WIDTH, g.dx));
                    translateX.setValue(value);
                }
            },

            onPanResponderRelease: (_, g) => {
                const threshold = DRAWER_WIDTH / 3;

                if (g.vx > 0.5 || g.dx > threshold) {
                    closeDrawer();
                } else {
                    openDrawer();
                }
            },
        })
    ).current;

    const menuItems = [
        {
            label: 'All Goals',
            path: '/(tabs)/more/goals',
            icon: SYSTEM_ICONS.list,
        },
        {
            label: 'Rewards',
            path: '/(tabs)/more/rewards',
            icon: SYSTEM_ICONS.reward,
        },
        {
            label: 'Journal',
            path: '/(tabs)/more/journal',
            icon: SYSTEM_ICONS.journal,
        },
        {
            label: 'Settings',
            path: '/(tabs)/more/settings',
            icon: SYSTEM_ICONS.settings,
        },
    ];

    return (
        <>
            {/* full-screen edge detection - only when drawer is closed */}
            {!open && (
                <View
                    pointerEvents="box-none"
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 999,
                    }}
                >
                    <View
                        {...edgePanResponder.panHandlers}
                        style={{ flex: 1 }}
                        pointerEvents="box-none"
                    />
                </View>
            )}

            {/* drawer modal */}
            <Modal
                transparent
                visible={open}
                animationType="none"
                onRequestClose={closeDrawer}
                statusBarTranslucent
            >
                {/* backdrop */}
                <Pressable
                    onPress={closeDrawer}
                    style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.4)',
                    }}
                />

                {/* drawer panel */}
                <Animated.View
                    {...drawerPanResponder.panHandlers}
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: DRAWER_WIDTH,
                        backgroundColor: '#fff',
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                        transform: [{ translateX }],
                    }}
                >
                    {/* menu items */}
                    <View style={{ flex: 1, paddingTop: 8 }}>
                        {menuItems.map(item => (
                            <Pressable
                                key={item.label}
                                onPress={() => {
                                    closeDrawer();
                                    setTimeout(() => {
                                        router.push(item.path as any);
                                    }, 200);
                                }}
                                style={({ pressed }) => ({
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    paddingHorizontal: 20,
                                    paddingVertical: 16,
                                    backgroundColor: pressed ? 'rgba(0,0,0,0.05)' : 'transparent',
                                })}
                            >
                                <Image
                                    source={item.icon}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        marginRight: 16,
                                    }}
                                    tintColor="rgba(0,0,0,0.7)"
                                />
                                <Text style={[globalStyles.body, {
                                    fontSize: 17,
                                    flex: 1,
                                }]}>
                                    {item.label}
                                </Text>
                                <Image
                                    source={SYSTEM_ICONS.sortRight}
                                    style={{
                                        width: 15,
                                        height: 15,
                                    }}
                                    tintColor="rgba(0,0,0,0.7)"
                                />
                            </Pressable>
                        ))}
                    </View>
                </Animated.View>
            </Modal>
        </>
    );
}