import { StyleSheet } from "react-native";

export const NewItemStyles = StyleSheet.create({
    mainCardContainer: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderRadius: 20,
        overflow: 'hidden',
        // grow with the content, but never past the screen — once it's full,
        // the ScrollView inside scrolls and the button bar stays pinned + reachable
        flexShrink: 1,
        // keep the button bar clear of the home indicator
        marginBottom: 40,
    }
})