// @/hooks/useCountdowns.ts
import { useCallback, useState } from 'react';

import { syncCountdowns } from '@/lib/countdown/widgetSync';
import { loadCountdowns } from '@/lib/supabase/queries/countdowns';
import { Countdown } from '@/types/Countdown';

/**
 * the countdown list page loads through here every time it's focused —
 * so after creating / editing / deleting on NewCountdown, coming back
 * reloads the full list and hands it to the widget in one place.
 */
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
            // reminders (and later the widget) always get the FULL list, never a partial one
            syncCountdowns(fresh, userId).catch(err => console.error('Error syncing countdowns:', err));
        } catch (err) {
            console.error('Error loading countdowns:', err);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    return { countdowns, loading, loadData };
}
