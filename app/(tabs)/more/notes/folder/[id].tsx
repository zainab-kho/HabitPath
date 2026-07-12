// @/app/(tabs)/more/notes/folder/[id].tsx
// a folder's notes — also serves "Deleted notes" via id === 'deleted'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import NoteCard from '@/components/notes/NoteCard';
import { useNotes } from '@/hooks/useNotes';

import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';

import { PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';

export default function NotesFolderPage() {
    const { user } = useAuth();
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const isDeletedView = id === 'deleted';

    const {
        notes,
        folders,
        loading,
        loadData,
        togglePin,
        deleteNote,
        recoverNote,
        deleteForever,
        toggleFolderPin,
    } = useNotes(user?.id);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const folder = folders.find(f => f.id === id);

    const folderNotes = useMemo(() => {
        const inView = isDeletedView
            ? notes.filter(n => n.deletedAt)
            : notes.filter(n => n.folderId === id && !n.deletedAt);
        // pinned first, then most recently edited
        return [...inView].sort((a, b) => {
            if (a.pinned !== b.pinned) return Number(b.pinned) - Number(a.pinned);
            return b.updatedAt.localeCompare(a.updatedAt);
        });
    }, [notes, id, isDeletedView]);

    const title = isDeletedView ? 'Deleted' : (folder?.name ?? 'Folder');

    if (loading) {
        return (
            <AppLinearGradient variant="notes.background">
                <PageContainer>
                    <PageHeader title={title} showBackButton />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={PAGE.notes.primary[0]} />
                    </View>
                </PageContainer>
            </AppLinearGradient>
        );
    }

    return (
        <AppLinearGradient variant="notes.background">
            <GestureHandlerRootView style={{ flex: 1 }}>
                <PageContainer>
                    <PageHeader title={title} showBackButton />

                    <ScrollView
                        contentContainerStyle={{ paddingHorizontal: 3, paddingBottom: 65, paddingTop: 5 }}
                        style={{ flex: 1 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {folderNotes.length === 0 && (
                            <Text style={styles.emptyText}>
                                {isDeletedView
                                    ? 'No deleted notes. Deleted notes land here and can be recovered.'
                                    : 'No notes in this folder yet.'}
                            </Text>
                        )}

                        {folderNotes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                onPress={() => {
                                    // deleted notes must be recovered before editing
                                    if (!isDeletedView) router.push(`/(tabs)/more/notes/${note.id}` as any);
                                }}
                                onPin={isDeletedView ? undefined : () => togglePin(note)}
                                onDelete={isDeletedView ? undefined : () => deleteNote(note.id)}
                                onRecover={isDeletedView ? () => recoverNote(note.id) : undefined}
                                onDeleteForever={isDeletedView ? () => deleteForever(note.id) : undefined}
                            />
                        ))}
                    </ScrollView>

                    {/* floating buttons: pin folder + new note in this folder */}
                    {!isDeletedView && folder && (
                        <View style={{ position: 'absolute', bottom: 30, right: 0, zIndex: 5 }}>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <Pressable onPress={() => toggleFolderPin(folder)}>
                                    <ShadowBox
                                        contentBackgroundColor={folder.pinned ? PAGE.notes.primary[1] : '#fff'}
                                        contentBorderRadius={30}
                                        shadowBorderRadius={30}
                                        shadowOffset={{ x: 1, y: 1 }}
                                    >
                                        <View style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
                                            <Image source={SYSTEM_ICONS.pin} style={{ width: 20, height: 20 }} />
                                        </View>
                                    </ShadowBox>
                                </Pressable>

                                <Pressable
                                    onPress={() => router.push({
                                        pathname: '/(tabs)/more/notes/new',
                                        params: { folderId: folder.id },
                                    } as any)}
                                >
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
                        </View>
                    )}
                </PageContainer>
            </GestureHandlerRootView>
        </AppLinearGradient>
    );
}

const styles = StyleSheet.create({
    emptyText: {
        fontFamily: 'label',
        fontSize: 13,
        opacity: 0.5,
        textAlign: 'center',
        marginTop: 30,
    },
});
