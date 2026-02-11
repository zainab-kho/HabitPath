// @/components/journal/SongCard.tsx
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { SongData } from '@/modals/SongPickerModal';
import ShadowBox from '@/ui/ShadowBox';

interface SongCardProps {
    song: SongData;
    onRemove?: () => void;
    lessContrast?: true;
}

// soft pastel palette for music
const SONG_PALETTE = [
    '#FFD6E0', // rose
    '#FFE8C8', // peach
    '#FFF3B0', // lemon
    '#C8F0D8', // mint
    '#C8E8FF', // sky
    '#E0D0FF', // lavender
    '#FFD0F0', // pink
    '#D0F0F0', // aqua
    '#F0E0C8', // sand
    '#D8FFD0', // lime
];

function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // unsigned 32-bit
    }
    return SONG_PALETTE[hash % SONG_PALETTE.length];
}

export default function SongCard({ song, onRemove, lessContrast }: SongCardProps) {
    const bgColor = hashColor(song.title + song.artist);

    return (
        <ShadowBox
            contentBackgroundColor={bgColor}
            contentBorderColor={lessContrast ? 'transparent' : 'rgba(0,0,0,1)'}
            shadowBorderRadius={20}
            shadowOffset={lessContrast ? { x: 0, y: 0 } : { x: 0, y: 2 }}
            style={{ marginBottom: 10 }}
        >
            <View style={styles.container}>
                <Image
                    source={{ uri: song.artworkUrl }}
                    style={styles.artwork}
                />

                <View style={styles.textBlock}>
                    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
                        <Image source={SYSTEM_ICONS.headphones} style={{ width: 10, height: 10, tintColor: PAGE.journal.primary[0] }} />
                        <Text style={styles.note}>Listening to...</Text>
                    </View>
                    <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
                    {song.album ? (
                        <Text style={styles.album} numberOfLines={1}>{song.album}</Text>
                    ) : null}
                </View>

                {onRemove && (
                    <Pressable onPress={onRemove} hitSlop={10} style={styles.removeBtn}>
                        <Text style={styles.removeText}>✕</Text>
                    </Pressable>
                )}
            </View>
        </ShadowBox>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 12,
    },
    artwork: {
        width: 56,
        height: 56,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    textBlock: {
        flex: 1,
        gap: 2,
    },
    note: {
        fontFamily: 'p1',
        fontSize: 10,
        color: PAGE.journal.primary[0],
        letterSpacing: 0.3,
    },
    title: {
        fontFamily: 'p2',
        fontSize: 14,
        color: '#222',
    },
    artist: {
        fontFamily: 'p1',
        fontSize: 12,
        color: '#444',
    },
    album: {
        fontFamily: 'p1',
        fontSize: 11,
        color: '#777',
    },
    removeBtn: {
        padding: 4,
    },
    removeText: {
        fontSize: 14,
        color: '#888',
    },
});