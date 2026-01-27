import { COLORS } from '@/constants/colors';
import { buttonStyles, globalStyles } from '@/styles';
import React from 'react';
import { Image, ImageSourcePropType, Pressable, StyleProp, Text, View, ViewStyle } from 'react-native';

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
        <View style={[{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 200,
        }, containerStyle]}>
            <View style={{
                alignItems: 'center',
                padding: 30,
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: '#000',
                borderRadius: 20,
                shadowColor: '#000',
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 5,
            }}>
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
                    marginBottom: 10,
                    color: '#000',
                    fontFamily: 'p2',
                    fontSize: 20,
                }}>
                    {title}
                </Text>

                {description && (
                    <Text style={{
                        textAlign: 'center',
                        marginBottom: 10,
                        color: 'rgba(0,0,0,0.6)',
                        fontFamily: 'label',
                        fontSize: 14,
                    }}>
                        {description}
                    </Text>
                )}

                {buttonText && buttonAction && (
                    <Pressable
                        onPress={buttonAction}
                        style={[
                            buttonStyles.button,
                            {marginVertical: 10, backgroundColor: buttonColor ?? '#ffcb50' },
                        ]}
                    >
                        <Text style={globalStyles.body}>{buttonText}</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}