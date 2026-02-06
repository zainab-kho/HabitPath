// @/components/types/JournalEntry.ts
export interface JournalEntry {
    id: string,
    date: Date,
    time: string,
    mood?: string,
    location?: string,
    lock?: string,
    entry?: string,
}