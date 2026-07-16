// @/app/(tabs)/more/notes/index.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, LayoutAnimation, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// hooks
import { useNotes } from '@/hooks/useNotes';

// helpers
import { noteSearchText } from '@/lib/editor/noteContent';

// components
import NoteCard from '@/components/notes/NoteCard';
import FoldersModal from '@/modals/notes/FoldersModal';

// ui
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import EmptyStateView from '@/ui/EmptyStateView';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

// constants
import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { Note } from '@/types/Note';

const NOTES_SORT_KEY = '@notes_sort_order';

export default function NotesPage() {
    const { user } = useAuth();
    const router = useRouter();
    // drawer access shows a back button; otherwise the bottom nav
    const { from } = useLocalSearchParams<{ from?: string }>();
    const fromDrawer = from === 'drawer';

    const {
        notes,
        folders,
        loading,
        loadData,
        togglePin,
        moveToFolder,
        deleteNote,
        addFolder,
    } = useNotes(user?.id);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    // inline search — expands from the search button (same as journal)
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const query = searchQuery.trim().toLowerCase();

    const toggleSearch = useCallback(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setSearchOpen(prev => {
            if (prev) setSearchQuery('');
            return !prev;
        });
    }, []);

    // sort order — persisted so it sticks across sessions (same as journal)
    const [sortOrder, setSortOrder] = useState<'latest' | 'earliest'>('latest');

    useEffect(() => {
        AsyncStorage.getItem(NOTES_SORT_KEY).then(stored => {
            if (stored === 'earliest' || stored === 'latest') setSortOrder(stored);
        });
    }, []);

    const toggleSort = useCallback(() => {
        setSortOrder(prev => {
            const next = prev === 'latest' ? 'earliest' : 'latest';
            AsyncStorage.setItem(NOTES_SORT_KEY, next);
            return next;
        });
    }, []);

    // folder modal — used for managing folders + assigning a note to one
    const [folderModalOpen, setFolderModalOpen] = useState(false);
    const [assigningNoteId, setAssigningNoteId] = useState<string | null>(null);

    // folder filter — chips filter the list in place instead of opening a page.
    // 'unfiled' = notes with no folder (default main view), 'all' = every note.
    const [folderFilter, setFolderFilter] = useState<'unfiled' | 'all' | string>('unfiled');

    const selectFolder = useCallback((key: 'unfiled' | 'all' | string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setFolderFilter(key);
    }, []);

    // if the selected folder gets deleted, fall back to the default (unfiled) view
    useEffect(() => {
        if (folderFilter !== 'unfiled' && folderFilter !== 'all' && !folders.some(f => f.id === folderFilter)) {
            setFolderFilter('unfiled');
        }
    }, [folders, folderFilter]);

    // folder chips, pinned first then alphabetical
    const folderChips = useMemo(
        () => [...folders].sort((a, b) =>
            a.pinned !== b.pinned ? Number(b.pinned) - Number(a.pinned) : a.name.localeCompare(b.name)
        ),
        [folders]
    );

    const activeNotes = useMemo(() => notes.filter(n => !n.deletedAt), [notes]);

    // apply the folder filter first: unfiled = no folder, all = everything, else a folder
    const inFolder = useMemo(() => {
        if (folderFilter === 'all') return activeNotes;
        if (folderFilter === 'unfiled') return activeNotes.filter(n => !n.folderId);
        return activeNotes.filter(n => n.folderId === folderFilter);
    }, [activeNotes, folderFilter]);

    // search across title + body text (HTML-aware)
    const matchesQuery = useCallback((note: Note) => {
        if (!query) return true;
        return noteSearchText(note).includes(query);
    }, [query]);

    const searched = useMemo(() => inFolder.filter(matchesQuery), [inFolder, matchesQuery]);

    // new notes created while a folder is active land in that folder
    const activeFolderId = folderFilter !== 'all' && folderFilter !== 'unfiled' ? folderFilter : null;

    const pinnedNotes = useMemo(() => searched.filter(n => n.pinned), [searched]);

    // unpinned notes grouped by month of last edit (like journal's month groups)
    const notesByMonth = useMemo(() => {
        const unpinned = searched
            .filter(n => !n.pinned)
            .sort((a, b) => sortOrder === 'latest'
                ? b.updatedAt.localeCompare(a.updatedAt)
                : a.updatedAt.localeCompare(b.updatedAt));

        const grouped: Record<string, Note[]> = {};
        for (const note of unpinned) {
            const monthKey = new Date(note.updatedAt)
                .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            if (!grouped[monthKey]) grouped[monthKey] = [];
            grouped[monthKey].push(note);
        }
        return grouped;
    }, [searched, sortOrder]);

    const handleSelectFolder = (folderId: string | null) => {
        if (assigningNoteId) {
            // assign mode — move the note
            moveToFolder(assigningNoteId, folderId);
            setAssigningNoteId(null);
            setFolderModalOpen(false);
        } else if (folderId) {
            // browse mode — filter the list in place instead of opening a page
            setFolderModalOpen(false);
            selectFolder(folderId);
        }
    };

    const renderChip = (key: string, label: string) => {
        const selected = folderFilter === key;
        return (
            <Pressable key={key} onPress={() => selectFolder(key)}>
                <View style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            </Pressable>
        );
    };

    const renderNote = (note: Note) => (
        <NoteCard
            key={note.id}
            note={note}
            onPress={() => router.push(`/(tabs)/more/notes/${note.id}` as any)}
            onPin={() => togglePin(note)}
            onFolder={() => {
                setAssigningNoteId(note.id);
                setFolderModalOpen(true);
            }}
            onDelete={() => deleteNote(note.id)}
        />
    );

    if (loading) {
        return (
            // keep the same wrapper shape as the loaded branch (GestureHandlerRootView
            // → PageContainer) so React reconciles the bottom nav instead of
            // remounting it — otherwise it flashes out when the spinner clears
            <AppLinearGradient variant="notes.background">
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <PageContainer showBottomNav={!fromDrawer}>
                        <PageHeader title="Notes" showBackButton={fromDrawer} />
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={PAGE.notes.primary[0]} />
                        </View>
                    </PageContainer>
                </GestureHandlerRootView>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="notes.background">
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PageContainer showBottomNav={!fromDrawer}>
                    <PageHeader title="Notes" showBackButton={fromDrawer} />

                    {/* sort / folder / search row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 10, paddingHorizontal: 3, marginBottom: 10 }}>
                        {searchOpen ? (
                            <View style={styles.searchBar}>
                                <Image source={SYSTEM_ICONS.search} style={{ width: 15, height: 15, opacity: 0.5 }} />
                                <TextInput
                                    style={styles.searchInput}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                    placeholder="Search notes..."
                                    placeholderTextColor="rgba(0,0,0,0.35)"
                                    autoFocus
                                    autoCorrect={false}
                                    cursorColor={PAGE.notes.primary[0]}
                                    selectionColor={PAGE.notes.primary[0]}
                                />
                                <Pressable onPress={toggleSearch} hitSlop={8}>
                                    <Text style={{ fontSize: 15, color: '#888' }}>✕</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <>
                                {/* sort toggle — sticks across sessions */}
                                <Pressable onPress={toggleSort}>
                                    <ShadowBox
                                        contentBackgroundColor="#fff"
                                        contentBorderRadius={20}
                                        shadowBorderRadius={20}
                                        shadowOffset={{ x: 1, y: 1 }}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12 }}>
                                            <Text style={{ fontFamily: 'p1', fontSize: 13 }}>
                                                {sortOrder === 'latest' ? 'Latest' : 'Earliest'}
                                            </Text>
                                            <Image
                                                source={SYSTEM_ICONS.sort}
                                                style={{
                                                    width: 12,
                                                    height: 12,
                                                    transform: [{ rotate: sortOrder === 'latest' ? '0deg' : '180deg' }],
                                                }}
                                            />
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                {/* folders */}
                                <Pressable onPress={() => { setAssigningNoteId(null); setFolderModalOpen(true); }}>
                                    <ShadowBox
                                        contentBorderRadius={30}
                                        shadowBorderRadius={30}
                                        shadowOffset={{ x: 1, y: 1 }}
                                    >
                                        <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                                            <Image source={SYSTEM_ICONS.folder} style={{ width: 16, height: 16 }} />
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                {/* search */}
                                <Pressable onPress={toggleSearch}>
                                    <ShadowBox
                                        contentBorderRadius={30}
                                        shadowBorderRadius={30}
                                        shadowOffset={{ x: 1, y: 1 }}
                                    >
                                        <View style={{ width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                                            <Image source={SYSTEM_ICONS.search} style={{ width: 16, height: 16 }} />
                                        </View>
                                    </ShadowBox>
                                </Pressable>
                            </>
                        )}
                    </View>

                    {/* folder filter chips — filter the list in place (no navigation) */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ gap: 8, paddingHorizontal: 3, paddingRight: 14 }}
                        style={styles.chipRow}
                    >
                        {renderChip('all', 'All')}
                        {renderChip('unfiled', 'Notes')}
                        {folderChips.map(f => renderChip(f.id, f.name))}
                    </ScrollView>

                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 65 }}
                        style={{ flex: 1 }}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* no matches */}
                        {query.length > 0 && searched.length === 0 && (
                            <Text style={styles.noMatches}>
                                No notes match "{searchQuery.trim()}"
                            </Text>
                        )}

                        {/* pinned */}
                        {pinnedNotes.length > 0 && (
                            <View style={{ marginBottom: 25 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                    <Image source={SYSTEM_ICONS.pin} style={{ width: 15, height: 15 }} />
                                    <Text style={styles.sectionHeader}>Pinned</Text>
                                </View>
                                {pinnedNotes.map(renderNote)}
                            </View>
                        )}

                        {/* month groups */}
                        {Object.entries(notesByMonth).map(([month, monthNotes]) => (
                            <View key={month} style={{ marginBottom: 25 }}>
                                <Text style={styles.sectionHeader}>{month}</Text>
                                <View style={{ marginTop: 10 }}>
                                    {monthNotes.map(renderNote)}
                                </View>
                            </View>
                        ))}

                        {/* empty state — full prompt when there are no notes at all,
                            otherwise a short note that this filter is empty */}
                        {searched.length === 0 && !query && (
                            activeNotes.length === 0 ? (
                                <View style={{ marginTop: 40 }}>
                                    <EmptyStateView
                                        icon={SYSTEM_ICONS.lists}
                                        title="No notes yet"
                                        description="Jot down anything — ideas, lists, reminders!"
                                        buttonText="New Note"
                                        buttonAction={() => router.push('/(tabs)/more/notes/new' as any)}
                                        buttonColor={PAGE.notes.primary[0]}
                                    />
                                </View>
                            ) : (
                                <Text style={styles.noMatches}>
                                    {folderFilter === 'unfiled'
                                        ? 'No loose notes — they’re all in folders. Tap “All” to see everything.'
                                        : 'No notes in this folder yet.'}
                                </Text>
                            )
                        )}
                    </ScrollView>

                    {/* floating new-note button — lands in the active folder if one is selected */}
                    <View style={{ position: 'absolute', bottom: fromDrawer ? 30 : 10, right: 0, zIndex: 5 }}>
                        <Pressable onPress={() => router.push(
                            activeFolderId
                                ? { pathname: '/(tabs)/more/notes/new', params: { folderId: activeFolderId } } as any
                                : '/(tabs)/more/notes/new' as any
                        )}>
                            <ShadowBox
                                contentBackgroundColor={PAGE.notes.primary[0]}
                                contentBorderRadius={30}
                                shadowBorderRadius={30}
                                shadowOffset={{ x: 1, y: 1 }}
                            >
                                <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                    <Image source={SYSTEM_ICONS.write} style={{ width: 20, height: 20 }} />
                                </View>
                            </ShadowBox>
                        </Pressable>
                    </View>

                    {/* folder modal */}
                    <FoldersModal
                        visible={folderModalOpen}
                        onClose={() => { setFolderModalOpen(false); setAssigningNoteId(null); }}
                        folders={folders}
                        notes={notes}
                        assignMode={!!assigningNoteId}
                        onSelectFolder={handleSelectFolder}
                        onOpenDeleted={() => {
                            setFolderModalOpen(false);
                            router.push('/(tabs)/more/notes/folder/deleted' as any);
                        }}
                        onAddFolder={addFolder}
                    />
                </PageContainer>
            </GestureHandlerRootView>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 2,
        borderColor: PAGE.notes.primary[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontFamily: 'p3',
        fontSize: 14,
        color: '#333',
        padding: 0,
    },
    sectionHeader: {
        fontFamily: 'p2',
        fontSize: 19,
    },
    chipRow: {
        flexGrow: 0,
        marginBottom: 12,
    },
    chip: {
        paddingHorizontal: 14,
        height: 32,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: PAGE.notes.primary[0],
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    chipSelected: {
        backgroundColor: PAGE.notes.primary[0],
    },
    chipText: {
        fontFamily: 'p1',
        fontSize: 13,
        color: '#000',
    },
    chipTextSelected: {
        color: '#fff',
    },
    noMatches: {
        fontFamily: 'label',
        fontSize: 13,
        opacity: 0.5,
        textAlign: 'center',
        marginTop: 30,
    },
});
