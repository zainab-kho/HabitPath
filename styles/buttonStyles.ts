// styles/buttonStyles.ts
import { StyleSheet } from 'react-native';

export const buttonStyles = StyleSheet.create({
    button: {
        // layout (flexbox, positioning)
        justifyContent: 'center',
        alignItems: 'center',

        // dimensions
        minWidth: 100,
        paddingVertical: 8,
        paddingHorizontal: 15,

        // visual/Appearance
        backgroundColor: '#FFEFCA',
        borderWidth: 1,
        borderRadius: 100,

        // shadows (iOS)
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,

        // shadows (Android)
        elevation: 5,
    },
    buttonText: {
        color: 'black',
        fontSize: 13,
        fontFamily: 'p2',
    },
    });