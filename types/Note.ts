// @/types/Note.ts

// block-based note content — each paragraph/line is a block with a format type
export type NoteBlockType =
    | 'body'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'bullet'
    | 'number'
    | 'quote'
    | 'check';

export interface NoteBlock {
    id: string;
    type: NoteBlockType;
    text: string;
    // only for 'check' blocks
    checked?: boolean;
}

export interface Note {
    id: string;
    userId: string;
    title: string;
    blocks: NoteBlock[];
    folderId: string | null;
    pinned: boolean;
    createdAt: string;   // ISO timestamp
    updatedAt: string;   // ISO timestamp
    deletedAt: string | null; // soft delete — lives in "Deleted notes" until recovered/purged
}

export interface NoteFolder {
    id: string;
    userId: string;
    name: string;
    pinned: boolean;
    createdAt: string;
    updatedAt: string;
}
