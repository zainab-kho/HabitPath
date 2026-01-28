// styles.ts
import { COLORS } from '@/constants/colors';
import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
    h1: {
        color: '#000',
        fontSize: 24,
        fontFamily: 'p1'
    },
    h2: {
        color: '#000',
        fontSize: 22,
        fontFamily: 'p2'
    },
    h3: {
        color: '#000',
        fontSize: 19,
        fontFamily: 'p2'
    },
    h4: {
        color: 'black',
        fontSize: 17,
        fontFamily: 'p2',
    },
    body: {
        color: 'black',
        fontSize: 15,
        fontFamily: 'p2',
    },
    body1: {
        color: 'black',
        fontSize: 14,
        fontFamily: 'p2',
    },
    body2: {
        color: '#000',
        fontSize: 15,
        fontFamily: 'p3',
    },
    label: {
        fontSize: 12,
        fontFamily: 'label',
        color: 'black',
        opacity: 0.7,
    },
    bubbleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: '#000',
        borderRadius: 8,
        gap: 4,
        backgroundColor: COLORS.RewardsAccent,
    },
});