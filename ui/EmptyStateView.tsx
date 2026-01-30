import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';

import { COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';

const ICON_SIZE = 30;
const ICON_MARGIN_BOTTOM = 10;

interface EmptyStateViewProps {
    icon: ImageSourcePropType;
    title: string;
    description?: string;
    buttonText?: string;
    buttonAction?: () => void;
    buttonColor?: string;
    secondButtonText?: string;
    secondButtonColor?: string;
    secondButtonAction?: () => void;
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
    secondButtonText,
    secondButtonAction,
    secondButtonColor,
}: EmptyStateViewProps) {
    return (
        <View
            style={[{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
            },
                containerStyle,
            ]}
        >
            <ShadowBox
                borderRadius={30}
                style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <View style={{
                    paddingHorizontal: 20,
                    paddingVertical: 30,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 20,
                }}>
                    <Image
                        source={icon}
                        style={{
                            width: ICON_SIZE,
                            height: ICON_SIZE,
                            tintColor: COLORS.Primary,
                        }}
                    />

                    <View style={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                    }}>
                        <Text style={[globalStyles.h3]}>{title}</Text>

                        {description && (
                            <Text style={[globalStyles.body2, { textAlign: 'center' }]}>
                                {description}
                            </Text>
                        )}
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        {buttonText && buttonAction && (
                            <ShadowBox contentBackgroundColor={buttonColor || PAGE.journal.primary[0]}>
                                <Pressable
                                    onPress={buttonAction}
                                    style={{ paddingVertical: 6, paddingHorizontal: 12, minWidth: 100 }}
                                >
                                    <Text style={globalStyles.body}>{buttonText}</Text>
                                </Pressable>
                            </ShadowBox>
                        )}

                        {secondButtonText && secondButtonAction && (
                            <ShadowBox contentBackgroundColor={secondButtonColor || PAGE.journal.primary[0]}>
                                <Pressable
                                    onPress={secondButtonAction}
                                    style={{ paddingVertical: 6, paddingHorizontal: 12, minWidth: 100 }}
                                >
                                    <Text style={globalStyles.body}>{secondButtonText}</Text>
                                </Pressable>
                            </ShadowBox>
                        )}
                    </View>
                </View>
            </ShadowBox >
        </View >
    );
}