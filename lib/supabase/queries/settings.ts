import { supabase } from "@/lib/supabase";
import { STORAGE_KEYS } from "@/storage/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const getResetTime = async (): Promise<{ hour: number; minute: number }> => {
    try {
        const cached = await AsyncStorage.getItem(STORAGE_KEYS.RESET_TIME);
        if (cached) return JSON.parse(cached);

        const { data } = await supabase
            .from('user_settings')
            .select('end_of_day_hour, end_of_day_minute, end_of_day_meridiem')
            .single();

        if (!data) return { hour: 4, minute: 0 };

        const hour24 =
            data.end_of_day_meridiem === 'AM'
                ? data.end_of_day_hour === '12' ? 0 : Number(data.end_of_day_hour)
                : data.end_of_day_hour === '12' ? 12 : Number(data.end_of_day_hour) + 12;

        const result = {
            hour: hour24,
            minute: Number(data.end_of_day_minute),
        };

        await AsyncStorage.setItem(STORAGE_KEYS.RESET_TIME, JSON.stringify(result));
        return result;
    } catch {
        return { hour: 4, minute: 0 };
    }
};