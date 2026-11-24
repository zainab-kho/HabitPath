// @/styles/modalStyles.ts
// shared pieces for popups
import { COLORS } from '@/colors';
import { StyleSheet } from 'react-native';

export const modalStyles = StyleSheet.create({
    // the dark see-through backdrop behind a popup, with the popup centered on top
    overlay: {
        flex: 1,
        backgroundColor: COLORS.Backdrop,
        justifyContent: 'center',
        alignItems: 'center',
    }
})