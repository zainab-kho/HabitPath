import React from 'react'
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native'

interface ShadowBoxProps {
    children: React.ReactNode
    style?: StyleProp<ViewStyle>
    shadowOffset?: { x: number; y: number }
    shadowColor?: string
    shadowBorderColor?: string
    shadowBorderWidth?: number
    shadowBorderRadius?: number
    contentBorderColor?: string
    contentBorderWidth?: number
    contentBackgroundColor?: string
    contentBorderRadius?: number
}

export default function ShadowBox({
    children,
    style,
    contentBackgroundColor = '#fff',
    contentBorderWidth = 1,
    contentBorderColor = '#000',
    contentBorderRadius = 15,
    shadowBorderWidth = 1,
    shadowOffset = { x: 0, y: 3 },
    shadowBorderColor = '#000',
    shadowColor = '#000',
    shadowBorderRadius=20,
}: ShadowBoxProps) {
    return (
        <View style={[styles.container, style]}>
            {/* shadow plate */}
            <View
                pointerEvents="none"
                style={[
                    styles.shadow,
                    {
                        transform: [
                            { translateX: shadowOffset.x },
                            { translateY: shadowOffset.y },
                        ],
                        backgroundColor: shadowColor,
                        borderColor: shadowBorderColor,
                        borderWidth: shadowBorderWidth,
                        borderRadius: shadowBorderRadius,
                    },
                ]}
            />

            {/* content plate */}
            <View
                style={[
                    styles.content,
                    {
                        backgroundColor: contentBackgroundColor,
                        borderColor: contentBorderColor,
                        borderWidth: contentBorderWidth,
                        borderRadius: contentBorderRadius,
                    },
                ]}
            >
                {children}
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },

    shadow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    content: {
        position: 'relative',
    },
})