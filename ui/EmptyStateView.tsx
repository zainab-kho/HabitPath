import { COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';
import ShadowBox from './ShadowBox';

interface EmptyStateViewProps {
    icon: ImageSourcePropType;
    title: string;
    description?: string;
    buttonText?: string;
    buttonAction?: () => void;
    buttonColor?: string;
    containerStyle?: StyleProp<ViewStyle>;
}

export default function EmptyStateView({
    icon,
    title,
    description,
    buttonText,
    buttonAction,
    containerStyle,
    buttonColor,
}: EmptyStateViewProps) {
    return (
        <View
            style={[
                {
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                containerStyle,
            ]}
        >
            <ShadowBox style={{
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <View style={{ paddingHorizontal: 20, paddingVertical: 30, justifyContent: 'center', alignItems: 'center' }}>
                    <Image
                        source={icon}
                        style={{
                            width: 30,
                            height: 30,
                            tintColor: COLORS.Primary,
                            marginBottom: 10,
                        }}
                    />

                    <Text style={{
                        textAlign: 'center',
                        marginBottom: 5,
                        color: '#000',
                        fontFamily: 'p2',
                        fontSize: 18,
                    }}>
                        {title}
                    </Text>

                    {description && (
                        <Text style={{
                            textAlign: 'center',
                            marginBottom: 20,
                            color: 'rgba(0,0,0,0.6)',
                            fontFamily: 'label',
                            fontSize: 14,
                        }}>
                            {description}
                        </Text>
                    )}

                    {buttonText && buttonAction && (
                        <ShadowBox contentBackgroundColor={buttonColor || PAGE.journal.primary[0]}>
                            <Pressable
                                onPress={buttonAction}
                                style={[
                                    { paddingVertical: 6, paddingHorizontal: 12, },
                                ]}
                            >
                                <Text style={globalStyles.body}>{buttonText}</Text>
                            </Pressable>
                        </ShadowBox>
                    )}
                </View>
            </ShadowBox >
        </View >
    );
}