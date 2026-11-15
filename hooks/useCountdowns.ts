// @/hooks/useCountdowns.ts
import { useCallback, useState } from 'react';

import { syncCountdowns } from '@/lib/countdown/widgetSync';
import { loadCountdowns } from '@/lib/supabase/queries/countdowns';
import { Countdown } from '@/types/Countdown';

// loads the countdown list for the countdown page.
// the page reloads every time it comes into focus, so coming back from creating,
// editing or deleting a countdown always shows (and syncs) the latest list
export function useCountdowns(userId?: string) {
    const [countdowns, setCountdowns] = useState<Countdown[]>([]);
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async () => {
        if (!userId) {
            setCountdowns([]);
            setLoading(false);
            return;
        }

        try {
            const fresh = await loadCountdowns(userId);
            setCountdowns(fresh);

            // keep the widget and reminders in step. not awaited, so the page never waits on it
            syncCountdowns(fresh, userId).catch(err => console.error('Error syncing countdowns:', err));
        } catch (err) {
            console.error('Error loading countdowns:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return { countdowns, loading, loadData };
}
