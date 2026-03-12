import { BUTTON_COLORS, COLORS, PAGE, PRESET_COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { addReward, getExchangeRate } from '@/services/rewards/rewards';
import { Reward } from '@/types/Reward';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  Pressable,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { globalStyles, uiStyles } from '@/styles';
import { lightenColor } from '@/utils';

const PRESET_TAGS = ['Food', 'Fun', 'Self-Care', 'Shopping', 'Entertainment', 'Travel', 'Fitness', 'Learning'];

export default function NewRewardItem() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollRef = useRef<KeyboardAwareScrollView>(null);

  const [name, setName] = useState('');
  const [costPoints, setCostPoints] = useState('');
  const [notes, setNotes] = useState('');
  const [backgroundColor, setBackgroundColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [rewardPrice, setRewardPrice] = useState('');
  const [rewardPoints, setRewardPoints] = useState('');
  const [pointsOverridden, setPointsOverridden] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(10);
  const [photoUri, setPhotoUri] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getExchangeRate().then(rate => {
      if (rate) setExchangeRate(rate);
    });
  }, []);

  // Auto-fill reward points from price unless the user has manually overridden
  useEffect(() => {
    if (!pointsOverridden) {
      const derived = parseInt(rewardPrice) * 10 || 0;
      setRewardPoints(derived > 0 ? derived.toString() : '');
    }
  }, [rewardPrice, pointsOverridden]);

  const price = parseInt(rewardPrice) * 10 || 0;
  const points = parseInt(rewardPoints) || 0;
  // The points that will actually be saved — manual override wins, otherwise derived from price
  const finalPoints = pointsOverridden ? points : price;
  const costDollars = exchangeRate > 0 ? finalPoints / exchangeRate : 0;

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to add a photo to your reward.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your reward.');
      return;
    }
    if (finalPoints <= 0) {
      Alert.alert('Invalid Cost', 'Please enter a point cost greater than 0.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to save a reward.');
      return;
    }

    setSaving(true);
    try {
      // Upload local image to Supabase Storage if one was selected
      let resolvedPhotoUri = photoUri;

      const newReward: Reward = {
        id: Date.now().toString(),
        name: name.trim(),
        costPoints: finalPoints,
        costDollars,
        backgroundColor,
        photoUri: resolvedPhotoUri,
        tags: selectedTags,
        notes: notes.trim() || undefined,
        dateAdded: new Date().toISOString().split('T')[0],
        isClaimed: false,
      };
      await addReward(newReward, user.id);
      router.back();
    } catch (err: any) {
      console.error('handleSave error:', err?.message ?? err);
      Alert.alert('Error', err?.message ?? 'Failed to save reward. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLinearGradient variant="rewards.background">
      <PageContainer>
        <PageHeader title="New Reward" showBackButton />

        <KeyboardAwareScrollView
          ref={scrollRef}
          enableOnAndroid
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          extraHeight={120}
          keyboardOpeningTime={0}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View>
              {/* ── main white card ───────────────────────────────── */}
              <View style={{
                borderWidth: 1,
                backgroundColor: '#fff',
                borderRadius: 20,
                padding: 30,
                gap: 20,
              }}>

                {/* REWARD NAME */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>REWARD NAME</Text>
                  <TextInput
                    style={[uiStyles.inputField, { borderColor: PAGE.rewards.primary[0] }]}
                    placeholder="e.g. Coffee shop treat"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={name}
                    onChangeText={setName}
                    cursorColor={PAGE.rewards.primary[0]}
                    selectionColor={PAGE.rewards.primary[0]}
                    onFocus={e => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                  />
                </View>

                <View style={{ gap: 30 }}>
                  <Text style={globalStyles.label}>COST OF REWARD</Text>

                  <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[0]}
                      shadowColor={PAGE.rewards.primary[0]}
                      shadowBorderColor={PAGE.rewards.primary[0]}
                    >
                      <Pressable
                        onPress={() => setRewardPrice(prev => Math.max(0, parseInt(prev) - 1).toString())}
                        style={{
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Text style={globalStyles.body}>-</Text>
                      </Pressable>
                    </ShadowBox>

                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[0]}
                      shadowColor={PAGE.rewards.primary[0]}
                      shadowBorderColor={PAGE.rewards.primary[0]}>
                      <View style={{
                        height: 30,
                        width: 100,
                        borderRadius: 20,
                        justifyContent: 'center',
                      }}>
                        <TextInput
                          style={[globalStyles.body, { textAlign: 'center' }]}
                          keyboardType="number-pad"
                          placeholder='$0'
                          value={price > 0 ? `$${rewardPrice}` : ''} // show $ prefix in input
                          onChangeText={text => setRewardPrice(text.replace('$', ''))}
                          onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                        />
                      </View>
                    </ShadowBox>

                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[0]}
                      shadowColor={PAGE.rewards.primary[0]}
                      shadowBorderColor={PAGE.rewards.primary[0]}
                    >
                      <Pressable
                        onPress={() =>
                          setRewardPrice((prev) => {
                            if (prev === '' || isNaN(Number(prev))) {
                              return '1';
                            }
                            return (Number(prev) + 1).toString();
                          })
                        }
                        style={{
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Text style={globalStyles.body}>+</Text>
                      </Pressable>
                    </ShadowBox>
                  </View>

                  {price > 0 && (
                    <View style={[globalStyles.bubbleLabel, {
                      paddingVertical: 10,
                      width: 200,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      alignSelf: 'center',
                      borderRadius: 15,
                      borderColor: COLORS.Rewards,
                    }]}>
                      <Text style={[globalStyles.body, { fontSize: 12, textAlign: 'center' }]}>
                        {price}
                      </Text>
                      <Image source={SYSTEM_ICONS.reward} style={{ width: 11, height: 11, tintColor: COLORS.Rewards }} />
                      <Text style={[globalStyles.label, { fontSize: 12, textAlign: 'center' }]}>
                        ({exchangeRate} pts = $1)
                      </Text>
                    </View>
                  )}
                </View>

                <View style={{ gap: 30 }}>
                  <Text style={globalStyles.label}>REWARD POINTS</Text>

                  <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10 }}>
                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[1]}
                      shadowColor={PAGE.rewards.primary[1]}
                      shadowBorderColor={PAGE.rewards.primary[1]}>
                      <Pressable
                        onPress={() => {
                          setPointsOverridden(true);
                          setRewardPoints(prev => Math.max(0, parseInt(prev) - 1).toString());
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Text style={globalStyles.body}>-</Text>
                      </Pressable>
                    </ShadowBox>

                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[1]}
                      shadowColor={PAGE.rewards.primary[1]}
                      shadowBorderColor={PAGE.rewards.primary[1]}
                    >
                      <View style={{
                        height: 30,
                        width: 100,
                        borderRadius: 20,
                        justifyContent: 'center',
                      }}>
                        <TextInput
                          style={[globalStyles.body, { textAlign: 'center' }]}
                          keyboardType="number-pad"
                          value={points > 0 ? `${rewardPoints} pts` : ''} // show pts suffix in input
                          placeholder='0 pts'
                          onChangeText={text => {
                            setPointsOverridden(true);
                            setRewardPoints(text.replace('pts', '').trim());
                          }}
                          onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                        />
                      </View>
                    </ShadowBox>

                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[1]}
                      shadowColor={PAGE.rewards.primary[1]}
                      shadowBorderColor={PAGE.rewards.primary[1]}>
                      <Pressable
                        onPress={() => {
                          setPointsOverridden(true);
                          setRewardPoints((prev) => {
                            if (prev === '' || isNaN(Number(prev))) {
                              return '1';
                            }
                            return (Number(prev) + 1).toString();
                          });
                        }}
                        style={{
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                        <Text style={globalStyles.body}>+</Text>
                      </Pressable>
                    </ShadowBox>
                  </View>
                </View>


                {/* "Use points only" */}

                {/* PHOTO */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>PHOTO (OPTIONAL)</Text>
                  <Pressable onPress={handlePickPhoto}>
                    <ShadowBox
                      contentBorderColor={PAGE.rewards.primary[0]}
                      shadowBorderColor={PAGE.rewards.primary[0]}
                      shadowColor={PAGE.rewards.primary[0]}
                      contentBorderRadius={12}
                      shadowBorderRadius={12}
                    >
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 10,
                        paddingHorizontal: 15,
                        overflow: 'hidden',
                      }}>
                        {photoUri ? (
                          <>
                            <Image
                              source={{ uri: photoUri }}
                              style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: '#000' }}
                            />
                            <Text style={globalStyles.body1}>Photo selected</Text>
                            <Pressable
                              onPress={() => setPhotoUri(undefined)}
                              style={{ marginLeft: 'auto' }}
                            >
                              <Text style={[globalStyles.label, { color: '#FF5656', fontSize: 12, opacity: 1 }]}>
                                Remove
                              </Text>
                            </Pressable>
                          </>
                        ) : (
                          <>
                            <Image source={SYSTEM_ICONS.photo} style={{ width: 15, height: 15 }} />
                            <Text style={[globalStyles.body1, { color: 'rgba(0,0,0,0.5)' }]}>
                              Add a photo
                            </Text>
                          </>
                        )}
                      </View>
                    </ShadowBox>
                  </Pressable>
                </View>

                {/* CARD COLOR */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>CARD COLOR</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {PRESET_COLORS.map(color => {
                      const isSelected = backgroundColor === color;
                      return (
                        <Pressable
                          key={color}
                          onPress={() => setBackgroundColor(color)}
                        >
                          <ShadowBox
                            contentBackgroundColor={isSelected ? color : '#fff'}
                            contentBorderColor={isSelected ? '#000' : color}
                            contentBorderWidth={1}
                            contentBorderRadius={18}
                            shadowBorderColor={isSelected ? '#000' : color}
                            shadowColor={isSelected ? '#000' : color}
                            shadowBorderRadius={18}
                          >
                            <View style={{ width: 36, height: 36 }} />
                          </ShadowBox>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* TAGS */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>TAGS</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {PRESET_TAGS.map(tag => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <Pressable key={tag} onPress={() => toggleTag(tag)}>
                          <ShadowBox
                            contentBackgroundColor={isSelected ? PAGE.rewards.primary[0] : '#fff'}
                            contentBorderColor={isSelected ? '#000' : PAGE.rewards.primary[0]}
                            shadowBorderColor={isSelected ? '#000' : PAGE.rewards.primary[0]}
                            shadowColor={isSelected ? '#000' : PAGE.rewards.primary[0]}
                            contentBorderRadius={100}
                            shadowBorderRadius={100}
                          >
                            <View style={{ paddingVertical: 6, paddingHorizontal: 12 }}>
                              <Text style={globalStyles.body1}>{tag}</Text>
                            </View>
                          </ShadowBox>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* NOTES */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>NOTES (OPTIONAL)</Text>
                  <TextInput
                    style={[uiStyles.inputField, {
                      borderColor: PAGE.rewards.primary[0],
                      height: 80,
                      textAlignVertical: 'top',
                    }]}
                    placeholder="Any extra details..."
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    multiline
                    numberOfLines={3}
                    value={notes}
                    onChangeText={setNotes}
                    cursorColor={PAGE.rewards.primary[0]}
                    selectionColor={PAGE.rewards.primary[0]}
                    onFocus={e => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                  />
                </View>

                {/* LIVE PREVIEW */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>PREVIEW</Text>
                  <View style={{ alignItems: 'center' }}>
                    <ShadowBox
                      contentBackgroundColor={backgroundColor}
                      contentBorderColor={'#000'}
                      shadowColor={PAGE.rewards.primary[0]}
                      contentBorderRadius={15}
                      shadowBorderRadius={15}
                    >
                      <View style={{
                        backgroundColor,
                        borderColor: '#000',
                        borderRadius: 15,
                        padding: 12,
                        width: 140,
                        height: 200,
                        alignItems: 'center',
                      }}>
                        {/* image / placeholder */}
                        <View style={{
                          width: 100,
                          height: 100,
                          borderWidth: 1,
                          borderColor: '#000',
                          borderRadius: 4,
                          marginBottom: 8,
                          overflow: 'hidden',
                          justifyContent: 'center',
                          alignItems: 'center',
                          backgroundColor: lightenColor(backgroundColor, 0.15),
                        }}>
                          {photoUri ? (
                            <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Image
                              source={SYSTEM_ICONS.gift}
                              style={{ width: 40, height: 40, tintColor: COLORS.Rewards }}
                            />
                          )}
                        </View>

                        {/* name */}
                        <Text style={[globalStyles.body1, { textAlign: 'center', marginBottom: 5 }]} numberOfLines={2}>
                          {name || 'Reward Name'}
                        </Text>

                        {/* pts badge */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 3,
                          backgroundColor: 'rgba(255,243,220,0.8)',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: 'rgba(255,213,137,0.8)',
                          marginBottom: selectedTags.length > 0 ? 6 : 0,
                        }}>
                          <Image source={SYSTEM_ICONS.reward} style={{ width: 11, height: 11, tintColor: COLORS.Rewards }} />
                          <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>
                            {price > 0 ? `${price} pts` : '0 pts'}
                          </Text>
                        </View>

                        {/* tags */}
                        {/* {selectedTags.length > 0 && ( */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                          {selectedTags.slice(0, 2).map(tag => (
                            <View key={tag} style={{
                              backgroundColor: 'rgba(0,0,0,0.1)',
                              paddingHorizontal: 5,
                              paddingVertical: 2,
                              borderRadius: 8,
                            }}>
                              <Text style={{ fontSize: 8, fontFamily: 'label' }}>{tag}</Text>
                            </View>
                          ))}
                        </View>
                        {/* )} */}
                      </View>
                    </ShadowBox>
                  </View>
                </View>

                {/* CANCEL / SAVE */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center' }}>
                  <Pressable onPress={() => router.back()} style={{ flex: 1, maxWidth: 120 }}>
                    <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={20}>
                      <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                        <Text style={globalStyles.body}>Cancel</Text>
                      </View>
                    </ShadowBox>
                  </Pressable>

                  <Pressable onPress={handleSave} disabled={saving} style={{ flex: 1, maxWidth: 120 }}>
                    <ShadowBox
                      contentBackgroundColor={saving ? BUTTON_COLORS.Disabled : BUTTON_COLORS.Save}
                      shadowBorderRadius={20}
                    >
                      <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                        <Text style={globalStyles.body}>{saving ? 'Saving...' : 'Save'}</Text>
                      </View>
                    </ShadowBox>
                  </Pressable>
                </View>

              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAwareScrollView>
      </PageContainer>
    </AppLinearGradient>
  );
}
