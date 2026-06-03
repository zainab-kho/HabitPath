import { QuestCreationProvider } from '@/contexts/QuestCreationContext';
import { Stack } from 'expo-router';

export default function QuestsLayout() {
    return (
        <QuestCreationProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    animation: 'none',
                    contentStyle: { backgroundColor: 'transparent' },
                }}
            />
        </QuestCreationProvider>
    );
}
