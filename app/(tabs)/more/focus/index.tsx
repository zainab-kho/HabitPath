// @/app/(tabs)/more/focus/index.tsx
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import { supabase } from '@/lib/supabase';
import { globalStyles } from '@/styles';


export default function Stopwatch() {
    const { user } = useAuth();

    const [sessionTitle, setSessionTitle] = useState('')
    const [showStartButton, setShowStartButton] = useState(true)
    const [isPaused, setIsPaused] = useState(false);

    // timer state
    const TOTAL_DURATION_SECONDS = 25 * 60; // 25 minutes in seconds
    const [timeRemaining, setTimeRemaining] = useState(TOTAL_DURATION_SECONDS);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // load saved time on mount
    useEffect(() => {
        (async () => {
            if (!user) return;

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('Error loading settings from Supabase:', error);
                return;
            }

            if (data) {

            }

            if (!data) {
                await supabase.from('user_settings').insert({
                    user_id: user.id,
                    end_of_day_hour: '4',
                    end_of_day_minute: '00',
                    end_of_day_meridiem: 'AM',
                });
            }
        })();
    }, [user]);

    // timer effect
    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            intervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        setShowStartButton(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, timeRemaining]);

    const handleTime = () => {
        setShowStartButton(false);
        setIsRunning(true);
    }

    const handleTimerPress = () => {
        if (isRunning) {
            // pause the timer
            setIsRunning(false);
            setIsPaused(true);
        } else if (isPaused) {
            // resume the timer
            setIsRunning(true);
            setIsPaused(false);
        }
    }

    // format time as MM:SS
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // calculate progress percentage
    const progressPercentage = Math.round(
        ((TOTAL_DURATION_SECONDS - timeRemaining) / TOTAL_DURATION_SECONDS) * 100
    );

    return (
        <AppLinearGradient variant={isPaused ? "focus.backgroundBreak" : "focus.backgroundMain"}>
            <PageContainer>
                <PageHeader title="Focus" showBackButton />

                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <Pressable 
                        onPress={handleTimerPress}
                        disabled={showStartButton}
                        style={{
                            height: 100,
                            alignSelf: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <Text style={{
                            fontFamily: 'p1',
                            fontSize: 70,
                            color: isPaused ? PAGE.focus.break[0] : PAGE.focus.primary[0]
                        }}>{formatTime(timeRemaining)}</Text>
                    </Pressable>

                    {sessionTitle && (
                        <View style={{ width: 100, alignSelf: 'center' }}>
                            <ShadowBox
                            >
                                <Text style={[globalStyles.body2, {
                                    textAlign: 'center',
                                    padding: 5,
                                }]}>{sessionTitle}</Text>
                            </ShadowBox>
                        </View>
                    )}

                    {showStartButton && (
                        <>
                            <Pressable style={{ width: 100, alignSelf: 'center' }}>
                                <ShadowBox
                                >
                                    <Text style={[globalStyles.body2, {
                                        textAlign: 'center',
                                        padding: 5,
                                    }]}>Add a tag...</Text>
                                </ShadowBox>
                            </Pressable>

                            <Pressable
                                style={{ width: 80, alignSelf: 'center', margin: 20 }}
                                onPress={handleTime}>
                                <ShadowBox
                                    contentBorderRadius={20}
                                    shadowBorderRadius={20}
                                    contentBackgroundColor={BUTTON_COLORS.Done}
                                >
                                    <Text style={[globalStyles.body2, {
                                        textAlign: 'center',
                                        paddingVertical: 6,

                                    }]}>Start</Text>
                                </ShadowBox>
                            </Pressable>
                        </>
                    )}
                </View>

                <View style={{ width: '80%', alignSelf: 'center', justifyContent: 'flex-end', marginBottom: 100 }}>
                    <ShadowBox
                        contentBorderWidth={1.5}
                        contentBorderRadius={50}
                        shadowBorderRadius={50}
                        contentBackgroundColor={isPaused? PAGE.focus.background[1] : PAGE.focus.background[0]}
                        shadowOffset={{ x: 3, y: 3 }}
                        shadowBorderWidth={1.5}
                        shadowColor={isPaused? PAGE.focus.break[1] : PAGE.focus.primary[1]}
                    >
                        <View style={{
                            height: 30,
                            position: 'relative',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            borderRadius: 48,
                        }}>
                            {/* Progress fill */}
                            <View style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: `${progressPercentage}%`,
                                backgroundColor: isPaused? PAGE.focus.break[0] : PAGE.focus.primary[0],
                                borderRadius: 0,
                            }} />

                            {/* percentage text */}
                            <Text style={[globalStyles.label, {
                                opacity: 1,
                                textAlign: 'center',
                                zIndex: 1,
                            }]}>
                                {progressPercentage}%
                            </Text>
                        </View>

                    </ShadowBox>
                </View>

            </PageContainer>
        </AppLinearGradient>
    );
}