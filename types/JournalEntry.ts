// @/components/types/JournalEntry.ts
export interface JournalEntry {
    id: string,
    date: Date,
    time: string,
    mood?: string,
    location?: string,
    lock?: string,
    entry?: string,
    song?: {
        title: string;
        artist: string;
        artworkUrl: string;
    },
    book?: {
        title: string;
        artist: string; // author
        artworkUrl: string;
    },
    show?: {
        title: string;
        artist: string; // show name (title is the season)
        artworkUrl: string;
    },
}