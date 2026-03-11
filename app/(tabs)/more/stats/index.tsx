import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, Modal, Pressable,
    ScrollView, Text, TextInput, TouchableWithoutFeedback, View, Image
} from 'react-native';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import { globalStyles } from '@/styles';
import { supabase } from '@/lib/supabase';
import { BUTTON_COLORS, COLORS, PAGE, TAG_COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';

// ─── types ───────────────────────────────────────────────────────────────────

interface SessionRow {
    id: string;
    duration_minutes: number;
    tag: string | null;
    course_id: string | null;
    course_name: string | null;
    completed_at: string;
}

interface SessionBlock extends SessionRow {
    color: string;
    label: string;
}

// ─── constants ────────────────────────────────────────────────────────────────

const ROW_HEIGHT = 22;
const DAY_LABEL_WIDTH = 32;
const MAX_HOURS = 8; // x-axis max
const MAX_MINUTES = MAX_HOURS * 60;

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function toDateKey(iso: string) { return iso.slice(0, 10); }

function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function monthName(month: number) {
    return ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'][month];
}

function formatDuration(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} h ${m} m`;
}

// ─── session edit modal ───────────────────────────────────────────────────────

function SessionModal({
    session, onClose, onDelete, onSave,
}: {
    session: SessionBlock;
    onClose: () => void;
    onDelete: () => void;
    onSave: (newMinutes: number) => void;
}) {
    const [duration, setDuration] = useState(String(session.duration_minutes));
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        const mins = parseInt(duration, 10);
        if (isNaN(mins) || mins <= 0) {
            Alert.alert('Invalid duration', 'Please enter a valid number of minutes.');
            return;
        }
        setSaving(true);
        await onSave(mins);
        setSaving(false);
    };

    const handleDelete = () => {
        Alert.alert('Delete session?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]);
    };

    return (
        <Modal visible transparent animationType="none" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
                    <TouchableWithoutFeedback>
                        <View style={{
                            backgroundColor: '#fff',
                            borderTopLeftRadius: 24, borderTopRightRadius: 24,
                            borderWidth: 1, borderColor: '#000',
                            padding: 24, gap: 18,
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={{
                                        width: 14, height: 14, borderRadius: 3,
                                        backgroundColor: session.color,
                                        borderWidth: 1.5, borderColor: '#000',
                                    }} />
                                    <Text style={globalStyles.h4}>{session.label}</Text>
                                </View>
                                <Text style={[globalStyles.label, { opacity: 0.5 }]}>
                                    {formatTime(session.completed_at)}
                                </Text>
                            </View>

                            <View style={{ gap: 6 }}>
                                <Text style={[globalStyles.label, { opacity: 0.6 }]}>DURATION (minutes)</Text>
                                <View style={{
                                    borderWidth: 1, borderColor: '#000', borderRadius: 12,
                                    paddingHorizontal: 14, paddingVertical: 10,
                                    flexDirection: 'row', alignItems: 'center',
                                }}>
                                    <TextInput
                                        value={duration}
                                        onChangeText={setDuration}
                                        keyboardType="number-pad"
                                        style={{ flex: 1, fontFamily: 'p2', fontSize: 16 }}
                                    />
                                    <Text style={[globalStyles.label, { opacity: 0.5 }]}>min</Text>
                                </View>
                            </View>

                            {/* action buttons */}
                            <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
                                <Pressable onPress={handleDelete} style={{ flex: 1 }}>
                                    <ShadowBox
                                        contentBackgroundColor={BUTTON_COLORS.Delete}
                                        shadowBorderRadius={15}
                                    >
                                        <View style={{ paddingVertical: 6 }}>
                                            <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                                Delete
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                <Pressable
                                    onPress={handleSave} disabled={saving}
                                    style={{ flex: 1 }}
                                // **TODO:
                                // disabled={ .length === 0 || saving}
                                >
                                    <ShadowBox
                                        contentBackgroundColor={
                                            BUTTON_COLORS.Done
                                        }
                                        shadowBorderRadius={15}
                                    >
                                        <View style={{ paddingVertical: 6 }}>
                                            <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                                                {saving
                                                    ? 'Saving...'
                                                    : 'Save'}
                                            </Text>
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

// ─── main ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
    const { user } = useAuth();

    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const [loading, setLoading] = useState(true);
    const [sessionsByDay, setSessionsByDay] = useState<Record<string, SessionBlock[]>>({});
    const [selectedSession, setSelectedSession] = useState<SessionBlock | null>(null);

    useEffect(() => { if (user) loadStats(); }, [user, viewYear, viewMonth]);

    const loadStats = async () => {
        setLoading(true);
        try {
            const start = new Date(viewYear, viewMonth, 1).toISOString();
            const end = new Date(viewYear, viewMonth + 1, 0, 23, 59, 59).toISOString();

            const { data } = await supabase
                .from('focus_sessions')
                .select('id, duration_minutes, tag, course_id, course_name, completed_at')
                .eq('user_id', user!.id)
                .gte('completed_at', start)
                .lte('completed_at', end)
                .order('completed_at', { ascending: true });

            const rows: SessionRow[] = data ?? [];

            const courseIds = [...new Set(rows.map(r => r.course_id).filter(Boolean))] as string[];
            const colorById: Record<string, string> = {};
            if (courseIds.length > 0) {
                const { data: cd } = await supabase.from('courses').select('id, color').in('id', courseIds);
                for (const c of cd ?? []) colorById[c.id] = c.color;
            }

            const byDay: Record<string, SessionBlock[]> = {};
            for (const r of rows) {
                const color = r.course_id && colorById[r.course_id]
                    ? colorById[r.course_id]
                    : r.tag && TAG_COLORS[r.tag]
                        ? TAG_COLORS[r.tag]
                        : TAG_COLORS['Study'] ?? 'rgba(0,0,0,0.12)';
                const label = r.course_name ?? r.tag ?? 'Focus';
                const block: SessionBlock = { ...r, color, label };
                const key = toDateKey(r.completed_at);
                if (!byDay[key]) byDay[key] = [];
                byDay[key].push(block);
            }
            setSessionsByDay(byDay);
        } catch (err) {
            console.error('Stats error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (session: SessionBlock, newMinutes: number) => {
        console.log("[handleSave] id=", session.id, "newMinutes=", newMinutes);
        const { data, error } = await supabase
            .from("focus_sessions")
            .update({ duration_minutes: newMinutes })
            .eq("id", session.id)
            .select();
        console.log("[handleSave] data=", JSON.stringify(data), "error=", JSON.stringify(error));
        setSelectedSession(null);
        loadStats();
    };

    const handleDelete = async (session: SessionBlock) => {
        console.log("[handleDelete] id=", session.id);
        const { data, error } = await supabase
            .from("focus_sessions")
            .delete()
            .eq("id", session.id)
            .select();
        console.log("[handleDelete] data=", JSON.stringify(data), "error=", JSON.stringify(error));
        setSelectedSession(null);
        loadStats();
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
    const canGoForward = !isCurrentMonth;

    const goBack = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };
    const goForward = () => {
        if (!canGoForward) return;
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    // Only show legend entries for tags/courses that appear this month
    const legendEntries = (() => {
        const seen = new Map<string, string>();
        for (const blocks of Object.values(sessionsByDay))
            for (const b of blocks) seen.set(b.label, b.color);
        return [...seen.entries()].map(([label, color]) => ({ label, color }));
    })();

    // hour tick marks along x-axis: 0,1,2,...,MAX_HOURS
    const hourTicks = Array.from({ length: MAX_HOURS + 1 }, (_, i) => i);

    return (
        <AppLinearGradient variant="stats.background">
            {/* Use flex:1 wrapper so legend can be positioned absolutely within */}
            <View style={{ flex: 1 }}>
                <PageContainer>
                    <PageHeader title="Stats" showBackButton />

                    {/* Month navigator */}
                    <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        justifyContent: 'center', gap: 20, paddingVertical: 0,
                    }}>
                        <Pressable onPress={goBack} style={{ padding: 8 }}>
                            <Image source={SYSTEM_ICONS.sortLeft} style={{ width: 18, height: 18 }} />
                        </Pressable>
                        <Text style={globalStyles.body}>
                            {monthName(viewMonth)} {viewYear}
                        </Text>
                        <Pressable onPress={goForward} style={{ padding: 8, opacity: canGoForward ? 1 : 0.25 }}>
                            <Image source={SYSTEM_ICONS.sortRight} style={{ width: 18, height: 18 }} />
                        </Pressable>
                    </View>

                    {loading ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" />
                        </View>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 100 }}
                        >
                            {/* Title */}


                            {/* Chart area — day label | bar track | duration label */}
                            {/* DURATION_LABEL_WIDTH reserves fixed space so bar track % aligns with axis ticks */}
                            {(() => {
                                const DURATION_LABEL_WIDTH = 52;
                                return (
                                    <View style={{ paddingLeft: DAY_LABEL_WIDTH, paddingRight: 12 }}>

                                        {/* Rows */}
                                        {Array.from({ length: daysInMonth }, (_, i) => {
                                            const day = i + 1;
                                            const dateKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                            const blocks = sessionsByDay[dateKey] ?? [];
                                            const totalMins = blocks.reduce((s, b) => s + b.duration_minutes, 0);
                                            const isToday = isCurrentMonth && day === now.getDate();

                                            return (
                                                <View key={dateKey} style={{
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    height: ROW_HEIGHT,
                                                }}>
                                                    {/* Day number */}
                                                    <View style={{
                                                        position: 'absolute',
                                                        left: -DAY_LABEL_WIDTH,
                                                        width: DAY_LABEL_WIDTH,
                                                        alignItems: 'flex-end',
                                                        paddingRight: 6,
                                                    }}>
                                                        <Text style={{
                                                            fontFamily: 'label', fontSize: 11,
                                                            color: isToday ? '#f87070' : 'rgba(0,0,0,0.45)',
                                                            fontWeight: isToday ? '700' : '400',
                                                        }}>{day}</Text>
                                                    </View>

                                                    {/* Bar track — flex:1, purely the graph area */}
                                                    <View style={{ flex: 1, height: ROW_HEIGHT, position: 'relative' }}>
                                                        {/* Session blocks — sequential, flush, no gaps */}
                                                        <View style={{
                                                            position: 'absolute',
                                                            top: 3, bottom: 3, left: 0, right: 0,
                                                            flexDirection: 'row',
                                                            overflow: 'hidden',
                                                        }}>
                                                            {blocks.map((block, idx) => {
                                                                const rawPct = block.duration_minutes / MAX_MINUTES * 100;
                                                                const usedPct = blocks.slice(0, idx).reduce(
                                                                    (s, b) => s + b.duration_minutes / MAX_MINUTES * 100, 0
                                                                );
                                                                const widthPct = Math.min(rawPct, 100 - usedPct);
                                                                const isFirst = idx === 0;
                                                                const isLast = idx === blocks.length - 1;

                                                                return (
                                                                    <Pressable
                                                                        key={block.id}
                                                                        onPress={() => setSelectedSession(block)}
                                                                        style={{
                                                                            width: `${widthPct}%` as any,
                                                                            height: '100%',
                                                                            backgroundColor: block.color,
                                                                            borderWidth: 1,
                                                                            borderColor: '#000',
                                                                            borderTopLeftRadius: isFirst ? 4 : 0,
                                                                            borderBottomLeftRadius: isFirst ? 4 : 0,
                                                                            borderTopRightRadius: isLast ? 4 : 0,
                                                                            borderBottomRightRadius: isLast ? 4 : 0,
                                                                            marginLeft: isFirst ? 0 : -1,
                                                                        }}
                                                                    />
                                                                );
                                                            })}
                                                        </View>
                                                    </View>

                                                    {/* Duration label — fixed width column, always to the right of bar track */}
                                                    <View style={{ width: DURATION_LABEL_WIDTH, paddingLeft: 5, justifyContent: 'center', height: ROW_HEIGHT }}>
                                                        {totalMins > 0 && (
                                                            <Text style={{
                                                                fontFamily: 'label', fontSize: 10,
                                                                color: 'rgba(0,0,0,0.5)',
                                                            }} numberOfLines={1}>{formatDuration(totalMins)}</Text>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        {/* X-axis ticks — matches bar track (flex:1), then DURATION_LABEL_WIDTH spacer */}
                                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                                            {/* tick area matches bar track flex:1 */}
                                            <View style={{ flex: 1, position: 'relative', height: 14 }}>
                                                {hourTicks.map(h => (
                                                    <View key={h} style={{
                                                        position: 'absolute',
                                                        left: `${(h / MAX_HOURS) * 100}%` as any,
                                                        transform: [{ translateX: h === MAX_HOURS ? -8 : 0 }],
                                                    }}>
                                                        <Text style={{
                                                            fontFamily: 'label', fontSize: 10,
                                                            color: 'rgba(0,0,0,0.45)',
                                                        }}>{h}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                            {/* spacer to match duration label column */}
                                            <View style={{ width: DURATION_LABEL_WIDTH }} />
                                        </View>
                                    </View>
                                );
                            })()}

                            {/* Empty state */}
                            {Object.keys(sessionsByDay).length === 0 && (
                                <View style={{ alignItems: 'center', marginTop: 20 }}>
                                    <Text style={[globalStyles.label, { opacity: 0.35 }]}>
                                        No sessions this month
                                    </Text>
                                </View>
                            )}
                        </ScrollView>
                    )}
                </PageContainer>

                {/* Floating legend — bottom right, only shows tags used this month */}
                {legendEntries.length > 0 && (
                    <View style={{
                        position: 'absolute',
                        bottom: 24,
                        right: 16,
                        width: 100,
                        backgroundColor: COLORS.Primary,
                        borderRadius: 15,
                        borderWidth: 1,
                        borderColor: '#000',
                        paddingVertical: 10,
                        paddingHorizontal: 10,
                        gap: 6,
                    }}>
                        {legendEntries.map(({ label, color }) => (
                            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{
                                    width: 10, height: 10, borderRadius: 2,
                                    backgroundColor: color,
                                    borderWidth: 1, borderColor: '#000',
                                    flexShrink: 0,
                                }} />
                                <Text style={[globalStyles.label, {
                                    fontSize: 10, opacity: 0.75,
                                    flexShrink: 1,
                                }]} numberOfLines={1}>{label}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {selectedSession && (
                    <SessionModal
                        session={selectedSession}
                        onClose={() => setSelectedSession(null)}
                        onDelete={() => handleDelete(selectedSession)}
                        onSave={(mins) => handleSave(selectedSession, mins)}
                    />
                )}
            </View>
        </AppLinearGradient>
    );
}