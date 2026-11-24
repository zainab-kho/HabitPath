// @/styles/globalStyles.ts
// the app's text styles, used on almost every page. the fonts are loaded in app/_layout.tsx:
// p2 is apercu medium, p3 is apercu regular, label is inter medium
import { REWARD_COLORS } from '@/colors';
import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
    // page titles
    h1: {
        color: '#000',
        fontSize: 22,
        fontFamily: 'p2'
    },
    // headings inside a page, like modal titles
    h2: {
        color: '#000',
        fontSize: 19,
        fontFamily: 'p2'
    },
    // smaller headings, like a card's title
    h4: {
        color: 'black',
        fontSize: 17,
        fontFamily: 'p2',
    },
    // the normal text size
    body: {
        color: 'black',
        fontSize: 15,
        fontFamily: 'p2',
    },
    // a bit smaller than body, for tighter spots like chips and toggles
    bodySmall: {
        color: 'black',
        fontSize: 14,
        fontFamily: 'p2',
    },
    // same size as body, but in the regular (lighter) weight, for descriptions and notes
    bodyRegular: {
        color: '#000',
        fontSize: 15,
        fontFamily: 'p3',
    },
    // the small faded text above fields, like "DATE" or "CARD COLOR"
    label: {
        fontSize: 12,
        fontFamily: 'label',
        color: 'black',
        opacity: 0.7,
    },
    // a little rounded tag in the rewards badge colors, like the points on a habit
    bubbleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderWidth: 1.5,
        borderRadius: 12,
        gap: 4,
        backgroundColor: REWARD_COLORS.Background,
        borderColor: REWARD_COLORS.Accent,
    },
});