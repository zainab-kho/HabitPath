// styles/buttonStyles.ts
import { StyleSheet } from 'react-native';

export const buttonStyles = StyleSheet.create({
    button: {
        // Layout (flexbox, positioning)
        justifyContent: 'center',
        alignItems: 'center',

        // Dimensions
        minWidth: 120,
        paddingVertical: 8,
        paddingHorizontal: 15,

        // Visual/Appearance
        backgroundColor: '#FFEFCA',
        borderWidth: 1,
        borderRadius: 100,

        // Shadows (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,

        // Shadows (Android)
        elevation: 5,
    },
});