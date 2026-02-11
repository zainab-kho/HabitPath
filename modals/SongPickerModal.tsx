// @/modals/SongPickerModal.tsx
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles, modalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export interface SongData {
    title: string;
    artist: string;
    artworkUrl: string;
    album?: string;
}

interface SongPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (song: SongData) => void;
}

interface ItunesResult {
    trackId: number;
    trackName: string;
    artistName: string;
    collectionName: string;
    artworkUrl100: string;
}

export default function SongPickerModal({ visible, onClose, onSelect }: SongPickerModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<ItunesResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<TextInput>(null);

    // reset state when modal opens
    useEffect(() => {
        if (visible) {
            setQuery('');
            setResults([]);
            setHasSearched(false);
            setTimeout(() => inputRef.current?.focus(), 200);
        }
    }, [visible]);

    const searchSongs = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        setIsLoading(true);
        setHasSearched(true);

        try {
            const encoded = encodeURIComponent(searchQuery.trim());
            const response = await fetch(
                `https://itunes.apple.com/search?term=${encoded}&entity=song&limit=10&media=music`
            );
            const data = await response.json();
            setResults(data.results || []);
        } catch (error) {
            console.error('iTunes search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleQueryChange = (text: string) => {
        setQuery(text);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchSongs(text), 400);
    };

    const handleSelect = (item: ItunesResult) => {
        // upgrade artwork to 300x300
        const artworkUrl = item.artworkUrl100.replace('100x100', '300x300');
        onSelect({
            title: item.trackName,
            artist: item.artistName,
            album: item.collectionName,
            artworkUrl,
        });
        onClose();
    };

    const renderResult = (item: ItunesResult) => (
        <Pressable
            key={item.trackId}
            onPress={() => handleSelect(item)}
            style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.7 : 1 }]}
        >
            <Image
                source={{ uri: item.artworkUrl100 }}
                style={styles.artwork}
            />
            <View style={styles.resultText}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.trackName}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{item.artistName}</Text>
                {item.collectionName ? (
                    <Text style={styles.songAlbum} numberOfLines={1}>{item.collectionName}</Text>
                ) : null}
            </View>
            <Text style={styles.addIcon}>+</Text>
        </Pressable>
    );

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={onClose}
        >
            <Pressable style={modalStyles.overlay} onPress={onClose}>
                <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>

                    {/* header */}
                    <View style={styles.header}>
                        <Text style={[globalStyles.h3, { fontSize: 18 }]}>Add a song</Text>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <Text style={styles.closeBtn}>✕</Text>
                        </Pressable>
                    </View>

                    {/* search input */}
                    <ShadowBox
                        contentBackgroundColor='#fff'
                        shadowBorderRadius={14}
                        shadowOffset={{ x: 2, y: 2 }}
                        style={{ marginBottom: 180 }}

                    >
                        <View style={styles.searchRow}>
                            <Image
                                source={SYSTEM_ICONS.search}
                                style={styles.searchIcon}
                            />
                            <TextInput
                                ref={inputRef}
                                value={query}
                                onChangeText={handleQueryChange}
                                placeholder="Search for a song or artist..."
                                placeholderTextColor="#aaa"
                                style={[globalStyles.body1, styles.searchInput]}
                                returnKeyType="search"
                                onSubmitEditing={() => searchSongs(query)}
                                clearButtonMode="while-editing"
                            />
                        </View>
                        {/* results area */}
                        <View style={styles.resultsContainer}>
                            {isLoading ? (
                                <View style={styles.centeredState}>
                                    <ActivityIndicator color={PAGE.journal.primary[0]} size="small" />
                                    <Text style={styles.stateText}>Searching...</Text>
                                </View>
                            ) : results.length > 0 ? (
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {results.map(renderResult)}
                                </ScrollView>
                            ) : hasSearched ? (
                                <View style={styles.centeredState}>
                                    <Text style={[globalStyles.body1, { color: '#999' }]}>No results found.</Text>
                                </View>
                            ) : (
                                <View style={styles.centeredState}>
                                    <Text style={[globalStyles.body1, { color: '#999' }]}>What are you listening to?</Text>
                                </View>
                            )}
                        </View>
                    </ShadowBox>



                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalCard: {
        width: '90%',
        maxHeight: '75%',
        backgroundColor: PAGE.journal.foreground[0],
        borderRadius: 20,
        borderWidth: 2,
        borderColor: PAGE.journal.border[0],
        padding: 18,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },

    closeBtn: {
        fontSize: 16,
        color: '#888',
        fontFamily: 'p1',
    },

    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 5,
        gap: 8,
    },

    searchIcon: {
        width: 15,
        height: 15
    },

    searchInput: {
        flex: 1,
        color: '#333',
    },

    resultsContainer: {
        flex: 1,
        minHeight: 200,
        paddingTop: 5,
    },

    centeredState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 30,
    },

    stateText: {
        fontFamily: 'p1',
        fontSize: 13,
        color: '#999',
    },

    resultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 12,
    },

    artwork: {
        width: 48,
        height: 48,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },

    resultText: {
        flex: 1,
        gap: 2,
    },

    songTitle: {
        fontFamily: 'p2',
        fontSize: 13,
        color: '#222',
    },

    songArtist: {
        fontFamily: 'p1',
        fontSize: 12,
        color: '#555',
    },

    songAlbum: {
        fontFamily: 'p1',
        fontSize: 11,
        color: '#aaa',
    },

    addIcon: {
        fontSize: 22,
        color: PAGE.journal.border[0],
        fontFamily: 'p2',
    },
});