// @/hooks/useNotes.ts
import { useCallback, useState } from 'react';

import {
    createFolder as createFolderService,
    deleteFolder as deleteFolderService,
    deleteNoteForever as deleteNoteForeverService,
    loadFolders,
    loadNotes,
    recoverNote as recoverNoteService,
    setFolderPinned as setFolderPinnedService,
    setNoteFolder as setNoteFolderService,
    setNotePinned as setNotePinnedService,
    softDeleteNote as softDeleteNoteService,
} from '@/lib/supabase/queries/notes';
import { setNotesCache } from '@/lib/notes/notesCache';
import { Note, NoteFolder } from '@/types/Note';

export function useNotes(userId?: string) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<NoteFolder[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!userId) {
            setNotes([]);
            setFolders([]);
            setLoading(false);
            return;
        }
        try {
            const [freshNotes, freshFolders] = await Promise.all([
                loadNotes(userId),
                loadFolders(userId),
            ]);
            setNotes(freshNotes);
            setFolders(freshFolders);
            setNotesCache(freshNotes); // keep the shared cache fresh for instant note opens
        } catch (err) {
            console.error('Error loading notes:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // every action updates state optimistically, then persists — a failure reloads

    const togglePin = useCallback(async (note: Note) => {
        if (!userId) return;
        setNotes(prev => prev.map(n => n.id === note.id ? { ...n, pinned: !note.pinned } : n));
        try {
            await setNotePinnedService(note.id, userId, !note.pinned);
        } catch (err) {
            console.error('Error pinning note:', err);
            loadData();
        }
    }, [userId, loadData]);

    const moveToFolder = useCallback(async (noteId: string, folderId: string | null) => {
        if (!userId) return;
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId } : n));
        try {
            await setNoteFolderService(noteId, userId, folderId);
        } catch (err) {
            console.error('Error moving note:', err);
            loadData();
        }
    }, [userId, loadData]);

    const deleteNote = useCallback(async (noteId: string) => {
        if (!userId) return;
        setNotes(prev => prev.map(n =>
            n.id === noteId ? { ...n, deletedAt: new Date().toISOString(), pinned: false } : n
        ));
        try {
            await softDeleteNoteService(noteId, userId);
        } catch (err) {
            console.error('Error deleting note:', err);
            loadData();
        }
    }, [userId, loadData]);

    const recoverNote = useCallback(async (noteId: string) => {
        if (!userId) return;
        setNotes(prev => prev.map(n => n.id === noteId ? { ...n, deletedAt: null } : n));
        try {
            await recoverNoteService(noteId, userId);
        } catch (err) {
            console.error('Error recovering note:', err);
            loadData();
        }
    }, [userId, loadData]);

    const deleteForever = useCallback(async (noteId: string) => {
        if (!userId) return;
        setNotes(prev => prev.filter(n => n.id !== noteId));
        try {
            await deleteNoteForeverService(noteId, userId);
        } catch (err) {
            console.error('Error permanently deleting note:', err);
            loadData();
        }
    }, [userId, loadData]);

    const addFolder = useCallback(async (name: string) => {
        if (!userId || !name.trim()) return;
        try {
            const folder = await createFolderService(userId, name.trim());
            setFolders(prev => [...prev, folder]);
        } catch (err) {
            console.error('Error creating folder:', err);
        }
    }, [userId]);

    const toggleFolderPin = useCallback(async (folder: NoteFolder) => {
        if (!userId) return;
        setFolders(prev => prev.map(f => f.id === folder.id ? { ...f, pinned: !folder.pinned } : f));
        try {
            await setFolderPinnedService(folder.id, userId, !folder.pinned);
        } catch (err) {
            console.error('Error pinning folder:', err);
            loadData();
        }
    }, [userId, loadData]);

    const removeFolder = useCallback(async (folderId: string) => {
        if (!userId) return;
        setFolders(prev => prev.filter(f => f.id !== folderId));
        setNotes(prev => prev.map(n => n.folderId === folderId ? { ...n, folderId: null } : n));
        try {
            await deleteFolderService(folderId, userId);
        } catch (err) {
            console.error('Error deleting folder:', err);
            loadData();
        }
    }, [userId, loadData]);

    return {
        notes,
        folders,
        loading,
        loadData,
        togglePin,
        moveToFolder,
        deleteNote,
        recoverNote,
        deleteForever,
        addFolder,
        toggleFolderPin,
        removeFolder,
    };
}
