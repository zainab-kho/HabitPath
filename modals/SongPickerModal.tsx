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

export type MediaType = 'song' | 'book' | 'show';

// songs + books use the iTunes search API; shows use TVMaze (better fuzzy
// matching and one result per show instead of one per season)
const MEDIA_CONFIG: Record<MediaType, {
    title: string;
    placeholder: string;
    emptyPrompt: string;
}> = {
    song: {
        title: 'Add a song',
        placeholder: 'Search for a song or artist...',
        emptyPrompt: 'What are you listening to?',
    },
    book: {
        title: 'Add a book',
        placeholder: 'Search for a book or author...',
        emptyPrompt: 'What are you reading?',
    },
    show: {
        title: 'Add a show',
        placeholder: 'Search for a TV show...',
        emptyPrompt: 'What are you watching?',
    },
};

interface SongPickerModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (song: SongData) => void;
    mediaType?: MediaType;
}

// normalized result shape shared by both APIs
interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    extra?: string;        // album (songs only)
    listArtworkUrl: string;   // small image for the results list
    savedArtworkUrl: string;  // larger image stored on the entry
}

function mapItunesResults(data: any, mediaType: MediaType): SearchResult[] {
    return (data.results ?? [])
        .filter((item: any) => item.artworkUrl100)
        .map((item: any) => ({
            id: String(item.trackId ?? item.collectionId),
            title: item.trackName ?? item.collectionName ?? '',
            subtitle: item.artistName ?? '',
            extra: mediaType === 'song' ? item.collectionName : undefined,
            listArtworkUrl: item.artworkUrl100,
            savedArtworkUrl: item.artworkUrl100.replace('100x100', '300x300'),
        }));
}

function mapTvMazeResults(data: any): SearchResult[] {
    return (data ?? [])
        .filter((item: any) => item.show?.image?.medium)
        .map((item: any) => {
            const show = item.show;
            const year = show.premiered ? show.premiered.slice(0, 4) : null;
            const network = show.network?.name ?? show.webChannel?.name ?? null;
            return {
                id: String(show.id),
                title: show.name,
                subtitle: [year, network].filter(Boolean).join(' · '),
                listArtworkUrl: show.image.medium,
                savedArtworkUrl: show.image.original ?? show.image.medium,
            };
        });
}

export default function SongPickerModal({ visible, onClose, onSelect, mediaType = 'song' }: SongPickerModalProps) {
    const config = MEDIA_CONFIG[mediaType];
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
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
            if (mediaType === 'show') {
                const response = await fetch(`https://api.tvmaze.com/search/shows?q=${encoded}`);
                const data = await response.json();
                setResults(mapTvMazeResults(data).slice(0, 10));
            } else {
                const params = mediaType === 'book' ? 'entity=ebook&media=ebook' : 'entity=song&media=music';
                const response = await fetch(
                    `https://itunes.apple.com/search?term=${encoded}&limit=10&${params}`
                );
                const data = await response.json();
                setResults(mapItunesResults(data, mediaType));
            }
        } catch (error) {
            console.error('Media search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [mediaType]);

    const handleQueryChange = (text: string) => {
        setQuery(text);

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => searchSongs(text), 400);
    };

    const handleSelect = (item: SearchResult) => {
        onSelect({
            title: item.title,
            artist: item.subtitle,
            album: item.extra,
            artworkUrl: item.savedArtworkUrl,
        });
        onClose();
    };

    const renderResult = (item: SearchResult) => (
        <Pressable
            key={item.id}
            onPress={() => handleSelect(item)}
            style={({ pressed }) => [styles.resultRow, { opacity: pressed ? 0.7 : 1 }]}
        >
            <Image
                source={{ uri: item.listArtworkUrl }}
                style={styles.artwork}
            />
            <View style={styles.resultText}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.songArtist} numberOfLines={1}>{item.subtitle}</Text>
                {item.extra ? (
                    <Text style={styles.songAlbum} numberOfLines={1}>{item.extra}</Text>
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
                        <Text style={[globalStyles.h3, { fontSize: 18 }]}>{config.title}</Text>
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
                                placeholder={config.placeholder}
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
                                    <Text style={[globalStyles.body1, { color: '#999' }]}>{config.emptyPrompt}</Text>
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