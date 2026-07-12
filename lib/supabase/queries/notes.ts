// @/lib/supabase/queries/notes.ts
import { supabase } from '@/lib/supabase';
import { Note, NoteBlock, NoteFolder } from '@/types/Note';

// ─── mappers ─────────────────────────────────────────────────────────────────

const mapNote = (row: any): Note => ({
    id: row.id,
    userId: row.user_id,
    title: row.title ?? '',
    blocks: (row.blocks ?? []) as NoteBlock[],
    folderId: row.folder_id ?? null,
    pinned: row.pinned ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at ?? null,
});

const mapFolder = (row: any): NoteFolder => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    pinned: row.pinned ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
});

// ─── notes ───────────────────────────────────────────────────────────────────

// loads everything (incl. soft-deleted, filtered client-side into "Deleted notes")
export async function loadNotes(userId: string): Promise<Note[]> {
    const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapNote);
}

export async function createNote(
    userId: string,
    fields: Partial<Pick<Note, 'title' | 'blocks' | 'folderId'>> = {}
): Promise<Note> {
    const { data, error } = await supabase
        .from('notes')
        .insert({
            user_id: userId,
            title: fields.title ?? '',
            blocks: fields.blocks ?? [],
            folder_id: fields.folderId ?? null,
        })
        .select()
        .single();

    if (error) throw error;
    return mapNote(data);
}

export async function updateNoteContent(
    noteId: string,
    userId: string,
    title: string,
    blocks: NoteBlock[]
): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ title, blocks, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function setNotePinned(noteId: string, userId: string, pinned: boolean): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ pinned })
        .eq('id', noteId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function setNoteFolder(noteId: string, userId: string, folderId: string | null): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ folder_id: folderId })
        .eq('id', noteId)
        .eq('user_id', userId);
    if (error) throw error;
}

// soft delete — recoverable from "Deleted notes"
export async function softDeleteNote(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ deleted_at: new Date().toISOString(), pinned: false })
        .eq('id', noteId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function recoverNote(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .update({ deleted_at: null })
        .eq('id', noteId)
        .eq('user_id', userId);
    if (error) throw error;
}

export async function deleteNoteForever(noteId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);
    if (error) throw error;
}

// ─── folders ─────────────────────────────────────────────────────────────────

export async function loadFolders(userId: string): Promise<NoteFolder[]> {
    const { data, error } = await supabase
        .from('note_folders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []).map(mapFolder);
}

export async function createFolder(userId: string, name: string): Promise<NoteFolder> {
    const { data, error } = await supabase
        .from('note_folders')
        .insert({ user_id: userId, name })
        .select()
        .single();

    if (error) throw error;
    return mapFolder(data);
}

export async function setFolderPinned(folderId: string, userId: string, pinned: boolean): Promise<void> {
    const { error } = await supabase
        .from('note_folders')
        .update({ pinned, updated_at: new Date().toISOString() })
        .eq('id', folderId)
        .eq('user_id', userId);
    if (error) throw error;
}

// notes inside keep existing (folder_id nulls out via FK)
export async function deleteFolder(folderId: string, userId: string): Promise<void> {
    const { error } = await supabase
        .from('note_folders')
        .delete()
        .eq('id', folderId)
        .eq('user_id', userId);
    if (error) throw error;
}
