// @/styles/formStyles.ts
// styles for the "new / edit something" pages, like new countdown and new meal
import { StyleSheet } from 'react-native';

export const formStyles = StyleSheet.create({
    // the white card that holds the form. it grows with what's inside, but stops at the
    // bottom of the screen: after that the fields scroll and the button bar stays in reach
    card: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 20,
        overflow: 'hidden',
        flexShrink: 1,
        // keeps the button bar clear of the iphone's home bar
        marginBottom: 40,
    },
});
