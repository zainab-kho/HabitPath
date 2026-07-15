// @/lib/notes/notesCache.ts
// A tiny in-memory cache of the user's notes, shared across screens. The list
// fills/refreshes it whenever it loads; the editor reads from it synchronously so
// opening a note is instant (no fetch, no spinner). Saves keep it in sync. It's
// module-level (lives for the app session) and falls back to a fetch when empty.

import { Note } from '@/types/Note';

let cache: Note[] = [];

// replace the whole cache (called after the list loads fresh notes)
export function setNotesCache(notes: Note[]) {
    cache = notes;
}

// read a single note synchronously — undefined if not cached yet
export function getCachedNote(id: string): Note | undefined {
    return cache.find(n => n.id === id);
}

// insert or update one note (called after a save)
export function upsertCachedNote(note: Note) {
    const i = cache.findIndex(n => n.id === note.id);
    cache = i >= 0 ? cache.map(n => (n.id === note.id ? note : n)) : [note, ...cache];
}
