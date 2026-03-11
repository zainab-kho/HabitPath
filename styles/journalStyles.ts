// @/app/styles/journalStyles
import { PAGE } from '@/constants/colors';
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

    moodBox: {
        height: 20,
        width: 20,
        borderRadius: 7,
        borderWidth: 1,
        backgroundColor: '#F9F8FF',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 5,
    },

    moodLabel: {
        fontSize: 11,
        opacity: 0.5,
    },

    moreText: {
        textAlign: 'center',
        opacity: 0.5,
        fontSize: 11,
        margin: 10,
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