// @/types/Quest.ts

export type QuestType = 'main' | 'side';

// what happens to a quest habit when its phase ends:
//   phase   — ends with the phase (end_date = phase end)
//   carry   — continues through the rest of the quest ('merge') (end_date = quest end)
//   forever — stays a permanent habit after the quest (no end_date)
export type QuestScope = 'phase' | 'carry' | 'forever';

export interface QuestPhase {
    id: string;
    questId: string;
    name: string;
    endDate: string | null;      // phase deadline (nullable)
    sortOrder: number;
    completedAt: string | null;  // set when the phase is completed/advanced past
}

export interface Quest {
    id: string;
    userId: string;
    name: string;
    type: QuestType;
    hasPhases: boolean;
    startDate: string | null;
    endDate: string | null;      // quest deadline (nullable)
    currentPhase: number;        // index into the sorted phases
    completedAt: string | null;
    createdAt: string;
    phases?: QuestPhase[];        // loaded for the detail screen
}
