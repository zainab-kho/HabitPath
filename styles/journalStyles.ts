// @/app/styles/journalStyles
import { PAGE } from '@/colors';
import { StyleSheet } from 'react-native';

export const journalStyle = StyleSheet.create({
    card: {
        borderWidth: 2,
        borderColor: PAGE.journal.border[0],
        backgroundColor: PAGE.journal.foreground[0],
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 10,
    },

    moodRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },

    moodItem: {
        alignItems: 'center',
        gap: 8,
    },

    moodLabel: {
        fontSize: 11,
        opacity: 0.5,
    },

    locationCard: {
        borderWidth: 2,
        borderColor: PAGE.journal.border[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 10,
        marginBottom: 10, 
    },

    journalCard: {
        borderWidth: 2,
        borderColor: PAGE.journal.border[0],
        backgroundColor: '#fff',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 10,
        maxHeight: 300,
    },

    textArea: {
        height: 250,
        paddingVertical: 12,
        paddingHorizontal: 10,
        fontSize: 15,
        lineHeight: 22,
        overflow: 'hidden',
    },
});