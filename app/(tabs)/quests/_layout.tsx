import { Stack } from 'expo-router';

export default function QuestsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                animation: 'none',
                contentStyle: { backgroundColor: 'transparent' },
            }}
        />
    );
}
