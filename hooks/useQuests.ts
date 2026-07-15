// @/hooks/useQuests.ts
import { useCallback, useState } from 'react';

import { deleteQuest as deleteQuestService, loadQuests } from '@/lib/supabase/queries/quests';
import { Quest } from '@/types/Quest';

export function useQuests(userId?: string) {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!userId) {
            setQuests([]);
            setLoading(false);
            return;
        }
        try {
            setQuests(await loadQuests(userId));
        } catch (err) {
            console.error('Error loading quests:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const removeQuest = useCallback(async (questId: string) => {
        if (!userId) return;
        setQuests(prev => prev.filter(q => q.id !== questId));
        try {
            await deleteQuestService(questId, userId);
        } catch (err) {
            console.error('Error deleting quest:', err);
            loadData();
        }
    }, [userId, loadData]);

    return { quests, loading, loadData, removeQuest };
}
