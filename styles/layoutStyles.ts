// app/styles/layoutStyles.ts
import { StyleSheet } from 'react-native';

export const layoutStyles = StyleSheet.create({
    container: {
        flex: 1
    },
    content: {
        flex: 1,
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    header: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 50,
        marginBottom: 20
    },
    pageTitle: {
        fontSize: 17,
        fontFamily: 'p1',
        color: 'black'
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
});