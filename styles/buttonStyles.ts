// @/styles/buttonStyles.ts
// the classic rounded button with a hard drop shadow. used on the date picker.
// most other buttons in the app use ShadowBox (ui/ShadowBox.tsx) instead
import { StyleSheet } from 'react-native';

export const buttonStyles = StyleSheet.create({
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 120,
        paddingVertical: 8,
        paddingHorizontal: 15,

        backgroundColor: '#FFEFCA',
        borderWidth: 1,
        borderRadius: 100,

        // a solid offset shadow, no blur. ios uses the shadow lines, android uses elevation
        shadowColor: '#000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },
});
