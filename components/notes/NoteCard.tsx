// @/components/notes/NoteCard.tsx
import React, { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { notePreview } from '@/lib/editor/noteContent';
import { Note } from '@/types/Note';
import ShadowBox from '@/ui/ShadowBox';

interface NoteCardProps {
    note: Note;
    onPress: () => void;
    // standard actions (regular list)
    onPin?: () => void;
    onFolder?: () => void;
    onDelete?: () => void;
    // deleted-notes actions — when provided these replace the standard ones
    onRecover?: () => void;
    onDeleteForever?: () => void;
}

const formatEditedDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const formatEditedTime = (iso: string) =>
    new Date(iso)
        .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        .replace(' ', '')
        .toLowerCase();

export default function NoteCard({
    note,
    onPress,
    onPin,
    onFolder,
    onDelete,
    onRecover,
    onDeleteForever,
}: NoteCardProps) {
    const swipeableRef = useRef<Swipeable>(null);

    const closeThen = (fn?: () => void) => () => {
        swipeableRef.current?.close();
        fn?.();
    };

    // swipe left reveals the actions on the right (same pattern as habit cards)
    const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => {
        const actions = onRecover || onDeleteForever
            ? [
                { icon: SYSTEM_ICONS.undo, onPress: closeThen(onRecover), tint: '#54d697' },
                { icon: SYSTEM_ICONS.trash, onPress: closeThen(onDeleteForever), tint: BUTTON_COLORS.Delete },
            ]
            : [
                { icon: SYSTEM_ICONS.pin, onPress: closeThen(onPin), tint: PAGE.notes.primary[0] },
                { icon: SYSTEM_ICONS.folder, onPress: closeThen(onFolder), tint: PAGE.notes.primary[1] },
                { icon: SYSTEM_ICONS.trash, onPress: closeThen(onDelete), tint: '#FF7A7A' },
            ];

        return (
            <View style={styles.actionsContainer}>
                {actions.map((action, i) => {
                    const translateX = progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [(actions.length - i) * 60, 0],
                    });
                    return (
                        <Animated.View key={i} style={{ transform: [{ translateX }] }}>
                            <Pressable onPress={action.onPress} style={styles.actionButton}>
                                <Image source={action.icon} style={[styles.actionIcon, { tintColor: action.tint }]} />
                            </Pressable>
                        </Animated.View>
                    );
                })}
            </View>
        );
    };

    const body = notePreview(note);

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            overshootRight={false}
            friction={2}
        >
            <ShadowBox 
                shadowOffset={{ x: 0, y: 3 }} 
                shadowColor={PAGE.notes.primary[0]}
                style={styles.cardWrap}>
                <Pressable onPress={onPress} style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.title} numberOfLines={1}>
                            {note.title.trim() || 'body'}
                        </Text>
                        <Text style={styles.date}>{formatEditedDate(note.updatedAt)}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.body} numberOfLines={2}>
                            {body || ''}
                        </Text>
                        <Text style={styles.time}>{formatEditedTime(note.updatedAt)}</Text>
                    </View>
                </Pressable>
            </ShadowBox>
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    cardWrap: {
        marginBottom: 12,
        // marginRight: 2,
    },
    card: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        gap: 10,
        marginBottom: 5,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 10,
    },
    title: {
        flex: 1,
        fontFamily: 'p1',
        fontSize: 15,
    },
    date: {
        fontFamily: 'p2',
        fontSize: 13,
    },
    body: {
        flex: 1,
        fontFamily: 'p3',
        fontSize: 13,
        opacity: 0.6,
    },
    time: {
        fontFamily: 'label',
        fontSize: 12,
        opacity: 0.6,
    },
    actionsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingLeft: 10,
        marginBottom: 12,
    },
    actionButton: {
        width: 44,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 15,
    },
    actionIcon: {
        width: 26,
        height: 26,
    },
});
