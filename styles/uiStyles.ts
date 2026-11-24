// @/styles/uiStyles.ts
// small shared pieces: text inputs and badges
import { StyleSheet } from 'react-native';

export const uiStyles = StyleSheet.create({
    // a white text box with a black border
    inputField: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 12,
        borderColor: '#000',
        padding: 15,
        fontFamily: 'p2',
        fontSize: 14,
    },
    // a small rounded tag with an icon and a bit of text. give it a background and border color
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
    },
    badgeIcon: {
        width: 12,
        height: 12,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: 'label',
    },
});