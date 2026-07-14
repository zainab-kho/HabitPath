// @/modals/notes/FoldersModal.tsx
import React, { useMemo, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView, ScrollView as GHScrollView } from 'react-native-gesture-handler';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { globalStyles } from '@/styles';
import { Note, NoteFolder } from '@/types/Note';
import ShadowBox from '@/ui/ShadowBox';

interface FoldersModalProps {
    visible: boolean;
    onClose: () => void;
    folders: NoteFolder[];
    notes: Note[];
    // browse mode: navigate into a folder. assign mode: pick a folder for a note.
    onSelectFolder: (folderId: string | null) => void;
    onOpenDeleted?: () => void;   // hidden in assign mode
    onAddFolder: (name: string) => void;
    assignMode?: boolean;
}

const formatShortDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function FoldersModal({
    visible,
    onClose,
    folders,
    notes,
    onSelectFolder,
    onOpenDeleted,
    onAddFolder,
    assignMode = false,
}: FoldersModalProps) {
    const [addingFolder, setAddingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    // pinned folders float to the top
    const sortedFolders = useMemo(
        () => [...folders].sort((a, b) => Number(b.pinned) - Number(a.pinned)),
        [folders]
    );

    const countInFolder = (folderId: string) =>
        notes.filter(n => n.folderId === folderId && !n.deletedAt).length;

    const deletedCount = notes.filter(n => n.deletedAt).length;

    const handleAddFolder = () => {
        if (newFolderName.trim()) {
            onAddFolder(newFolderName.trim());
        }
        setNewFolderName('');
        setAddingFolder(false);
    };

    const handleClose = () => {
        setAddingFolder(false);
        setNewFolderName('');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                {/* no buttons — tap outside to cancel */}
                <Pressable style={styles.overlay} onPress={handleClose}>
                    <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

                        <View style={{ marginTop: 20 }}>
                            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 16 }]}>
                                {assignMode ? 'Add to Folder' : 'Folders'}
                            </Text>
                        </View>

                        <GHScrollView
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20, gap: 12 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {sortedFolders.length === 0 && (
                                <Text style={styles.emptyText}>
                                    No folders yet — add one below!
                                </Text>
                            )}

                            {/* folder cards */}
                            {sortedFolders.map(folder => (
                                <ShadowBox key={folder.id}>
                                    <Pressable
                                        onPress={() => onSelectFolder(folder.id)}
                                        style={styles.folderCard}
                                    >
                                        <View style={styles.folderRow}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                                                {folder.pinned && (
                                                    <Image
                                                        source={SYSTEM_ICONS.pin}
                                                        style={{ width: 13, height: 13, tintColor: PAGE.notes.primary[0] }}
                                                    />
                                                )}
                                                <Text style={styles.folderTitle} numberOfLines={1}>{folder.name}</Text>
                                            </View>
                                            <Text style={styles.folderDate}>{formatShortDate(folder.createdAt)}</Text>
                                        </View>
                                        <View style={styles.folderRow}>
                                            <Text style={styles.folderCount}>
                                                {countInFolder(folder.id)} {countInFolder(folder.id) === 1 ? 'note' : 'notes'}
                                            </Text>
                                            <Text style={styles.folderCount}>edited {formatShortDate(folder.updatedAt)}</Text>
                                        </View>
                                    </Pressable>
                                </ShadowBox>
                            ))}

                            {/* assign mode: allow removing a note from its folder */}
                            {assignMode && (
                                <ShadowBox
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    contentBackgroundColor={BUTTON_COLORS.Quiet}
                                >
                                    <Pressable
                                        onPress={() => onSelectFolder(null)}
                                        style={styles.bottomButton}
                                    >
                                        <Text style={globalStyles.body1}>No folder</Text>
                                    </Pressable>
                                </ShadowBox>
                            )}

                            {/* deleted notes — browse mode only */}
                            {!assignMode && onOpenDeleted && (
                                <ShadowBox
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    contentBackgroundColor={BUTTON_COLORS.Quiet}
                                >
                                    <Pressable onPress={onOpenDeleted} style={styles.bottomButton}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Image source={SYSTEM_ICONS.trash} style={{ width: 15, height: 15, opacity: 0.7 }} />
                                            <Text style={globalStyles.body1}>
                                                Deleted notes{deletedCount > 0 ? ` (${deletedCount})` : ''}
                                            </Text>
                                        </View>
                                    </Pressable>
                                </ShadowBox>
                            )}

                            {/* add new folder */}
                            {addingFolder ? (
                                <View style={styles.addFolderRow}>
                                    <TextInput
                                        style={styles.addFolderInput}
                                        value={newFolderName}
                                        onChangeText={setNewFolderName}
                                        placeholder="Folder name..."
                                        placeholderTextColor="rgba(0,0,0,0.35)"
                                        autoFocus
                                        cursorColor={PAGE.notes.primary[0]}
                                        selectionColor={PAGE.notes.primary[0]}
                                        onSubmitEditing={handleAddFolder}
                                        returnKeyType="done"
                                    />
                                    <Pressable onPress={handleAddFolder} hitSlop={8}>
                                        <Image source={SYSTEM_ICONS.plus} style={{ width: 18, height: 18 }} />
                                    </Pressable>
                                </View>
                            ) : (
                                <ShadowBox
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    contentBackgroundColor={BUTTON_COLORS.Quiet}
                                >
                                    <Pressable onPress={() => setAddingFolder(true)} style={styles.bottomButton}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Image source={SYSTEM_ICONS.plus} style={{ width: 15, height: 15, opacity: 0.7 }} />
                                            <Text style={globalStyles.body1}>Add new folder</Text>
                                        </View>
                                    </Pressable>
                                </ShadowBox>
                            )}
                        </GHScrollView>

                    </Pressable>
                </Pressable>
            </GestureHandlerRootView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 3,
        borderColor: PAGE.notes.primary[0],
        maxHeight: '80%',
        width: '90%',
        alignSelf: 'center',
    },
    emptyText: {
        fontFamily: 'label',
        fontSize: 13,
        opacity: 0.5,
        textAlign: 'center',
        marginVertical: 10,
    },
    folderCard: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        gap: 4,
    },
    folderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    folderTitle: {
        fontFamily: 'p1',
        fontSize: 15,
        flexShrink: 1,
    },
    folderDate: {
        fontFamily: 'p2',
        fontSize: 13,
    },
    folderCount: {
        fontFamily: 'label',
        fontSize: 12,
        opacity: 0.6,
    },
    bottomButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        alignItems: 'center',
    },
    addFolderRow: {
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
    addFolderInput: {
        flex: 1,
        fontFamily: 'p3',
        fontSize: 14,
        color: '#333',
        padding: 0,
    },
});
