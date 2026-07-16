// @/app/(tabs)/more/settings/NavBar.tsx
// Lets the user choose which 3 destinations fill slots 2–4 of the bottom nav.
// Slot 1 is always Habits and is shown locked.
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BUTTON_COLORS, COLORS } from '@/constants/colors';
import {
    CONFIGURABLE_SLOT_COUNT,
    DEFAULT_NAV_TABS,
    FIXED_TAB,
    NAV_DESTINATIONS,
    NavTabId,
    SELECTABLE_TABS,
} from '@/constants/navTabs';
import { useNavTabs } from '@/navigation/NavTabsContext';
import { globalStyles } from '@/styles';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

export default function NavBarSettings() {
    const router = useRouter();
    const { navTabs, setNavTabs, resetNavTabs } = useNavTabs();

    // local draft; selection order determines slot order (slots 2 → 4)
    const [selected, setSelected] = useState<NavTabId[]>(navTabs);
    const [saving, setSaving] = useState(false);

    const isFull = selected.length >= CONFIGURABLE_SLOT_COUNT;
    const canSave =
        !saving &&
        selected.length === CONFIGURABLE_SLOT_COUNT &&
        // only enable save when the draft actually differs from what's saved
        selected.some((id, i) => id !== navTabs[i]);

    const toggle = (id: NavTabId) => {
        setSelected(prev => {
            if (prev.includes(id)) return prev.filter(t => t !== id);
            if (prev.length >= CONFIGURABLE_SLOT_COUNT) return prev; // full — ignore
            return [...prev, id];
        });
    };

    const onSave = () => {
        if (selected.length !== CONFIGURABLE_SLOT_COUNT || saving) return;
        setSaving(true);
        setNavTabs(selected);
        // brief pause so the "Saving…" state is visible before navigating back
        setTimeout(() => router.back(), 400);
    };

    const onReset = () => {
        resetNavTabs();
        setSelected(DEFAULT_NAV_TABS);
    };

    // preview = Habits (fixed) + the current draft selection
    const previewIds: NavTabId[] = [FIXED_TAB, ...selected];

    return (
        <AppLinearGradient variant="settings.background">
            <PageContainer showBottomNav={false}>
                <PageHeader title="Navigation Bar" showBackButton />

                <ScrollView contentContainerStyle={{ paddingHorizontal: 30, gap: 20, paddingBottom: 120 }}>
                    <Text style={[globalStyles.body, { textAlign: 'center', opacity: 0.7 }]}>
                        Habits always stays first. Pick 3 more, in the order you tap them.
                    </Text>

                    {/* live preview of the bar */}
                    <View style={styles.preview}>
                        {previewIds.map((id, i) => {
                            const dest = NAV_DESTINATIONS[id];
                            return (
                                <View key={id} style={styles.previewSlot}>
                                    <Image
                                        source={dest.icon}
                                        style={{ width: 26, height: 26 }}
                                        tintColor={i === 0 ? COLORS.Primary : '#555'}
                                    />
                                    <Text style={styles.previewLabel} numberOfLines={1}>{dest.label}</Text>
                                </View>
                            );
                        })}
                        {/* empty placeholders for unfilled slots */}
                        {Array.from({ length: CONFIGURABLE_SLOT_COUNT - selected.length }).map((_, i) => (
                            <View key={`empty-${i}`} style={styles.previewSlot}>
                                <View style={styles.emptyDot} />
                                <Text style={[styles.previewLabel, { opacity: 0.3 }]}>—</Text>
                            </View>
                        ))}
                    </View>

                    {/* fixed slot 1 */}
                    <View style={{ gap: 10 }}>
                        <Text style={[globalStyles.body2, { opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                            Slot 1 · locked
                        </Text>
                        <View style={[styles.optionRow, { opacity: 0.55 }]}>
                            <Image source={NAV_DESTINATIONS[FIXED_TAB].icon} style={{ width: 22, height: 22 }} tintColor="#555" />
                            <Text style={[globalStyles.body, { flex: 1 }]}>{NAV_DESTINATIONS[FIXED_TAB].label}</Text>
                            <Text style={[globalStyles.body2, { opacity: 0.6 }]}>Always first</Text>
                        </View>
                    </View>

                    {/* selectable pool */}
                    <View style={{ gap: 10 }}>
                        <Text style={[globalStyles.body2, { opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5 }]}>
                            Slots 2–4 · pick {CONFIGURABLE_SLOT_COUNT}
                        </Text>

                        {SELECTABLE_TABS.map(id => {
                            const dest = NAV_DESTINATIONS[id];
                            const order = selected.indexOf(id); // -1 if unselected
                            const isSelected = order !== -1;
                            const disabled = !isSelected && isFull;

                            return (
                                <Pressable
                                    key={id}
                                    onPress={() => toggle(id)}
                                    disabled={disabled}
                                    style={[
                                        styles.optionRow,
                                        isSelected && { borderColor: '#000', backgroundColor: COLORS.PrimaryLight },
                                        disabled && { opacity: 0.4 },
                                    ]}
                                >
                                    <Image source={dest.icon} style={{ width: 22, height: 22 }} tintColor="#555" />
                                    <Text style={[globalStyles.body, { flex: 1 }]}>{dest.label}</Text>
                                    {isSelected ? (
                                        <View style={styles.slotBadge}>
                                            {/* slot number: first pick fills slot 2 */}
                                            <Text style={styles.slotBadgeText}>{order + 2}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.emptyBadge} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* save */}
                    <ShadowBox
                        contentBorderRadius={20}
                        shadowBorderRadius={20}
                        contentBackgroundColor={BUTTON_COLORS.Quiet}
                    >
                        <Pressable
                            onPress={onSave}
                            disabled={!canSave}
                            style={{ paddingVertical: 5, paddingHorizontal: 15, flex: 1, alignItems: 'center', opacity: (canSave || saving) ? 1 : 0.5 }}
                        >
                            <Text style={globalStyles.body1}>{saving ? 'Saving…' : 'Save'}</Text>
                        </Pressable>
                    </ShadowBox>

                    {/* reset to default */}
                    <Pressable onPress={onReset} style={{ alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={[globalStyles.body2, { opacity: 0.6, textDecorationLine: 'underline' }]}>
                            Reset to default
                        </Text>
                    </Pressable>
                </ScrollView>
            </PageContainer>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    preview: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#000',
        backgroundColor: '#fff',
    },
    previewSlot: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    previewLabel: {
        fontFamily: 'label',
        fontSize: 10,
        color: '#000',
    },
    emptyDot: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#bbb',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#00000022',
        backgroundColor: '#ffffffcc',
    },
    slotBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.Primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#000'
    },
    slotBadgeText: {
        fontFamily: 'label',
        fontSize: 12,
        color: '#000',
        fontWeight: '600',
    },
    emptyBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#00000022',
    },
});
