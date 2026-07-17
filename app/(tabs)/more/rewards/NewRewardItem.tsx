import { BUTTON_COLORS, COLORS, PAGE, PRESET_COLORS } from '@/constants/colors';
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import { addReward, deleteRewardPhoto, getExchangeRate, updateReward, uploadRewardPhoto } from '@/services/rewards/rewards';
import { Reward } from '@/types/Reward';
import { AppLinearGradient } from '@/ui/AppLinearGradient';
import PageContainer from '@/ui/PageContainer';
import PageHeader from '@/ui/PageHeader';
import ShadowBox from '@/ui/ShadowBox';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  Pressable,
  Switch,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { globalStyles, uiStyles } from '@/styles';
import { lightenColor } from '@/utils';
import { formatLocalDate } from '@/utils/dateUtils';

const PRESET_TAGS = ['Food', 'Fun', 'Self-Care', 'Shopping', 'Entertainment', 'Travel', 'Fitness', 'Learning'];

// same width the wishlist grid produces on the rewards page:
// page content is 90% of screen, grid pads 10 per side, items take 45%
const REWARD_CARD_WIDTH = (Dimensions.get('window').width * 0.9 - 20) * 0.45;

export default function NewRewardItem() {
  const router = useRouter();
  const { user } = useAuth();
  const scrollRef = useRef<KeyboardAwareScrollView>(null);

  // edit mode: reward passed from RewardDetailModal, mirrors the habit edit flow
  const params = useLocalSearchParams<{ editData?: string }>();
  const editReward: Reward | null = params.editData ? JSON.parse(params.editData as string) : null;
  const isEditMode = !!editReward;

  // points count as manually overridden only when they don't match the
  // price-derived formula (dollars × 10) — keeps price ↔ points linked otherwise
  const editPointsOverridden = !!editReward &&
    !(Number.isInteger(editReward.costDollars) && editReward.costPoints === editReward.costDollars * 10);

  const [name, setName] = useState(editReward?.name ?? '');
  const [notes, setNotes] = useState(editReward?.notes ?? '');
  const [backgroundColor, setBackgroundColor] = useState<string>(editReward?.backgroundColor ?? PRESET_COLORS[0]);
  const [selectedTags, setSelectedTags] = useState<string[]>(editReward?.tags ?? []);
  const [rewardPrice, setRewardPrice] = useState(
    editReward && editReward.costDollars > 0 ? String(editReward.costDollars) : ''
  );
  const [rewardPoints, setRewardPoints] = useState(editReward ? String(editReward.costPoints) : '');
  const [pointsOverridden, setPointsOverridden] = useState(editPointsOverridden);
  const [exchangeRate, setExchangeRate] = useState(10);
  const [photoUri, setPhotoUri] = useState<string | undefined>(editReward?.photoUri);
  const [saving, setSaving] = useState(false);
  const [recurring, setRecurring] = useState(editReward?.recurring ?? false);
  const [link, setLink] = useState(editReward?.link ?? '');
  const [moreOptions, setMoreOptions] = useState(
    !!(editReward?.link || editReward?.notes || editReward?.tags?.length || editReward?.recurring)
  );

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
      // upload local image to Supabase Storage so the photo follows the account
      let resolvedPhotoUri = photoUri;
      if (photoUri && !photoUri.startsWith('http')) {
        try {
          resolvedPhotoUri = await uploadRewardPhoto(photoUri, user.id);
        } catch (uploadErr) {
          console.error('Photo upload failed, keeping local copy:', uploadErr);
          Alert.alert(
            'Photo Upload Failed',
            'The reward was saved, but the photo could only be stored on this device.'
          );
        }
      }

      if (isEditMode && editReward) {
        // photo was replaced or removed — clean up the old stored one
        if (editReward.photoUri && editReward.photoUri !== resolvedPhotoUri) {
          deleteRewardPhoto(editReward.photoUri);
        }
        // keep identity + claim state, update everything editable
        await updateReward({
          ...editReward,
          name: name.trim(),
          costPoints: finalPoints,
          costDollars,
          backgroundColor,
          photoUri: resolvedPhotoUri,
          tags: selectedTags,
          notes: notes.trim() || undefined,
          link: link.trim() || undefined,
          recurring,
        }, user.id);
      } else {
        const newReward: Reward = {
          id: Date.now().toString(),
          name: name.trim(),
          costPoints: finalPoints,
          costDollars,
          backgroundColor,
          photoUri: resolvedPhotoUri,
          tags: selectedTags,
          notes: notes.trim() || undefined,
          link: link.trim() || undefined,
          recurring,
          // local date, not UTC — evening adds should count as today
          dateAdded: formatLocalDate(new Date()),
          isClaimed: false,
        };
        await addReward(newReward, user.id);
      }
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
        <PageHeader title={isEditMode ? 'Edit Reward' : 'New Reward'} showBackButton />

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

                {/* photo + name — mirrors the icon + name row on the new habit page */}
                <View style={{ gap: 6 }}>
                  <View style={{ marginBottom: 10 }}>
                    <TextInput
                      style={[
                        globalStyles.body,
                        {
                          flex: 1,
                          borderBottomWidth: 1,
                          borderBottomColor: PAGE.rewards.primary[0],
                          paddingVertical: 10,
                        },
                      ]}
                      placeholder="Enter reward name..."
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      value={name}
                      onChangeText={setName}
                      cursorColor={PAGE.rewards.primary[0]}
                      selectionColor={PAGE.rewards.primary[0]}
                      onFocus={e => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                    />
                  </View>

                  <View style={{ gap: 10 }}>
                    <Text style={globalStyles.label}>ADD A PHOTO</Text>

                    {photoUri ? (
                      <View style={{ alignItems: 'center', gap: 10, backgroundColor: PAGE.rewards.primary[0] + '95', paddingVertical: 15, borderRadius: 15 }}>
                        <Pressable
                          onPress={handlePickPhoto}
                          style={{ width: 150, height: 150, borderWidth: 1 }}
                        >
                          <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
                        </Pressable>

                        <Pressable onPress={() => setPhotoUri(undefined)}>
                          <ShadowBox
                            contentBackgroundColor={BUTTON_COLORS.Delete}
                            style={{ width: 55, alignContent: 'center' }}>
                            <Text style={[globalStyles.body, { fontSize: 10, paddingHorizontal: 10, paddingVertical: 3, textAlign: 'center' }]}>CLEAR</Text>
                          </ShadowBox>
                        </Pressable>
                      </View>
                    ) : (
                      /* same button style as the end date button on the new habit page */
                      <Pressable onPress={handlePickPhoto}>
                        <ShadowBox
                          contentBackgroundColor={PAGE.rewards.primary[0]}
                          contentBorderRadius={10}
                        >
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            paddingVertical: 5,
                            paddingHorizontal: 15,
                          }}>
                            <Image source={SYSTEM_ICONS.photo} style={{ width: 17, height: 17 }} />
                            <Text style={globalStyles.body1}>Choose a photo</Text>
                          </View>
                        </ShadowBox>
                      </Pressable>
                    )}
                  </View>
                </View>

                {/* cost of reward */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>COST OF REWARD</Text>

                  <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10, marginTop: 10 }}>
                    <ShadowBox shadowColor={PAGE.rewards.primary[0]}>
                      <Pressable
                        onPress={() => setRewardPrice(prev => Math.max(0, parseInt(prev) - 1).toString())}
                        style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={globalStyles.body}>-</Text>
                      </Pressable>
                    </ShadowBox>

                    <ShadowBox shadowColor={PAGE.rewards.primary[0]}>
                      <View style={{ paddingVertical: 2, width: 100, borderRadius: 20, justifyContent: 'center' }}>
                        <TextInput
                          style={[globalStyles.body, { textAlign: 'center' }]}
                          keyboardType="number-pad"
                          placeholder='$0'
                          placeholderTextColor={COLORS.PlaceHolder}
                          value={price > 0 ? `$${rewardPrice}` : ''}
                          onChangeText={text => setRewardPrice(text.replace('$', ''))}
                          onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                        />
                      </View>
                    </ShadowBox>

                    <ShadowBox shadowColor={PAGE.rewards.primary[0]}>
                      <Pressable
                        onPress={() =>
                          setRewardPrice((prev) => {
                            if (prev === '' || isNaN(Number(prev))) return '1';
                            return (Number(prev) + 1).toString();
                          })
                        }
                        style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={globalStyles.body}>+</Text>
                      </Pressable>
                    </ShadowBox>
                  </View>

                  {price > 0 && (
                    <View style={[globalStyles.bubbleLabel, {
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      width: 200,
                      alignSelf: 'center',
                    }]}>
                      <Text style={[globalStyles.body1, { fontSize: 12, textAlign: 'center' }]}>
                        {price}
                      </Text>
                      <Image source={SYSTEM_ICONS.reward} style={{ width: 11, height: 11, tintColor: COLORS.Rewards }} />
                      <Text style={[globalStyles.label, { fontSize: 12, textAlign: 'center' }]}>
                        ({exchangeRate} pts = $1)
                      </Text>
                    </View>
                  )}
                </View>

                {/* reward points */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>REWARD POINTS</Text>

                  <View style={{ flexDirection: 'row', alignSelf: 'center', gap: 10, marginTop: 10 }}>
                    <ShadowBox shadowColor={PAGE.rewards.primary[1]}>
                      <Pressable
                        onPress={() => {
                          setPointsOverridden(true);
                          setRewardPoints(prev => Math.max(0, parseInt(prev) - 1).toString());
                        }}
                        style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={globalStyles.body}>-</Text>
                      </Pressable>
                    </ShadowBox>

                    <ShadowBox shadowColor={PAGE.rewards.primary[1]}>
                      <View style={{ paddingVertical: 2, width: 100, borderRadius: 20, justifyContent: 'center' }}>
                        <TextInput
                          style={[globalStyles.body, { textAlign: 'center' }]}
                          keyboardType="number-pad"
                          value={points > 0 ? `${rewardPoints} pts` : ''}
                          placeholder='0 pts'
                          placeholderTextColor={COLORS.PlaceHolder}
                          onChangeText={text => {
                            setPointsOverridden(true);
                            setRewardPoints(text.replace('pts', '').trim());
                          }}
                          onFocus={(e) => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                        />
                      </View>
                    </ShadowBox>

                    <ShadowBox shadowColor={PAGE.rewards.primary[1]}>
                      <Pressable
                        onPress={() => {
                          setPointsOverridden(true);
                          setRewardPoints((prev) => {
                            if (prev === '' || isNaN(Number(prev))) return '1';
                            return (Number(prev) + 1).toString();
                          });
                        }}
                        style={{ paddingVertical: 3, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={globalStyles.body}>+</Text>
                      </Pressable>
                    </ShadowBox>
                  </View>
                </View>

                {/* CARD COLOR */}
                <View style={{ gap: 10 }}>
                  <Text style={globalStyles.label}>CARD COLOR</Text>
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                    padding: 15,
                    backgroundColor: PAGE.rewards.background[1],
                    borderRadius: 15

                  }}>
                    {PRESET_COLORS.map(color => {
                      const isSelected = backgroundColor === color;
                      return (
                        <ShadowBox
                          key={color}
                          contentBackgroundColor={isSelected ? color : '#fff'}
                          contentBorderColor={isSelected ? '#000' : color}
                          contentBorderWidth={1}
                          contentBorderRadius={18}
                          shadowBorderColor={isSelected ? '#000' : color}
                          shadowColor={isSelected ? '#000' : color}
                          shadowBorderRadius={18}
                        >
                          <Pressable
                            onPress={() => setBackgroundColor(color)}
                            style={{ width: 25, height: 25 }}
                          />
                        </ShadowBox>
                      );
                    })}
                  </View>
                </View>

                {/* more options — tags, link, notes, recurring */}
                <Pressable
                  onPress={() => setMoreOptions(!moreOptions)}
                  style={{
                    margin: 15,
                    alignSelf: 'center',
                    opacity: 0.6,
                  }}>
                  <Text style={globalStyles.label}>{moreOptions ? 'Less options' : 'More options'}</Text>
                </Pressable>

                {moreOptions && (
                  <View style={{ gap: 20 }}>
                    {/* tags */}
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

                    {/* link */}
                    <View style={{ gap: 10 }}>
                      <Text style={globalStyles.label}>LINK (OPTIONAL)</Text>
                      <TextInput
                        style={[uiStyles.inputField, { borderColor: '#000' }]}
                        placeholder="https://..."
                        placeholderTextColor="rgba(0,0,0,0.4)"
                        value={link}
                        onChangeText={setLink}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        cursorColor={PAGE.rewards.primary[0]}
                        selectionColor={PAGE.rewards.primary[0]}
                        onFocus={e => scrollRef.current?.scrollToFocusedInput(e.nativeEvent.target)}
                      />
                    </View>

                    {/* notes */}
                    <View style={{ gap: 10 }}>
                      <Text style={globalStyles.label}>NOTES (OPTIONAL)</Text>
                      <TextInput
                        style={[uiStyles.inputField, {
                          borderColor: '#000',
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

                    {/* recurring toggle — same switch row style as the new habit page */}
                    <View style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 4,
                      paddingHorizontal: 2,
                    }}>
                      <Text style={globalStyles.body1}>Recurring?</Text>
                      <Switch
                        value={recurring}
                        onValueChange={setRecurring}
                        trackColor={{ false: '#ddd', true: PAGE.rewards.primary[0] }}
                        thumbColor="#fff"
                      />
                    </View>
                  </View>
                )}

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
                      {/* same layout as the wishlist card: badge → image → name → tags */}
                      <View style={{
                        borderRadius: 15,
                        padding: 12,
                        width: REWARD_CARD_WIDTH,
                        minHeight: 200,
                        alignItems: 'center',
                      }}>
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
                          alignSelf: 'center',
                          marginBottom: 10,
                        }}>
                          <Image source={SYSTEM_ICONS.reward} style={{ width: 11, height: 11, tintColor: COLORS.Rewards }} />
                          <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>
                            {finalPoints > 0 ? `${finalPoints} pts` : '0 pts'}
                          </Text>
                        </View>

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

                        {/* name — same font as the real wishlist card */}
                        <Text style={{ fontFamily: 'p2', fontSize: 13, textAlign: 'center', marginBottom: 5 }} numberOfLines={1}>
                          {name || 'Reward Name'}
                        </Text>

                        {/* tags */}
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
                      </View>
                    </ShadowBox>
                  </View>
                </View>

                {/* CANCEL / SAVE */}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center' }}>
                  <Pressable onPress={() => router.back()} style={{ flex: 1, maxWidth: 100 }}>
                    <ShadowBox contentBackgroundColor={BUTTON_COLORS.Cancel} shadowBorderRadius={20}>
                      <View style={{ paddingVertical: 5, alignItems: 'center' }}>
                        <Text style={globalStyles.body}>Cancel</Text>
                      </View>
                    </ShadowBox>
                  </Pressable>

                  <Pressable onPress={handleSave} disabled={saving} style={{ flex: 1, maxWidth: 100 }}>
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
