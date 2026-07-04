import { globalStyles } from '@/styles';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import { lightenColor } from '@/utils';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
// RN's ScrollView doesn't scroll inside these modals — use gesture-handler's
import { ScrollView } from 'react-native-gesture-handler';
import { Reward } from '@/types/Reward';
import { SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { parseLocalDate } from '@/utils/dateUtils';
import { useRouter } from 'expo-router';

// same width the wishlist grid produces on the rewards page:
// page content is 90% of screen, grid pads 10 per side, items take 45%
const REWARD_CARD_WIDTH = (Dimensions.get('window').width * 0.9 - 20) * 0.45;

// "2026-06-04" → "Fri, Jun 4 2026"
const formatRewardDate = (dateStr: string): string => {
  const d = parseLocalDate(dateStr);
  const base = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return `${base} ${d.getFullYear()}`;
};

interface Props {
  visible: boolean;
  onClose: () => void;
  reward: Reward | null;
  onDelete: (id: string) => void;
}

export default function RewardDetailModal({ visible, onClose, reward, onDelete }: Props) {
  const router = useRouter();
  const [moreOptions, setMoreOptions] = useState(false);

  // collapse the options section every time the modal opens
  useEffect(() => {
    if (visible) setMoreOptions(false);
  }, [visible]);

  if (!reward) return null;

  const bgColor = reward.backgroundColor || '#FFF3D0';

  const handleEdit = () => {
    onClose();
    router.push({
      pathname: '/(tabs)/more/rewards/NewRewardItem',
      params: { editData: JSON.stringify(reward) },
    } as any);
  };

  const handleOpenLink = () => {
    if (!reward.link) return;
    // prepend https:// if the user typed a bare domain
    const url = reward.link.startsWith('http') ? reward.link : `https://${reward.link}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could not open link', url);
    });
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Reward?',
      `Are you sure you want to delete "${reward.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(reward.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>

          <View style={{ marginTop: 20 }}>
            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 20 }]}>
              Reward Details
            </Text>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
            {/* preview card — mirrors the wishlist card on the rewards page */}
            <View style={{ alignSelf: 'center', width: REWARD_CARD_WIDTH, marginBottom: 24 }}>
              <ShadowBox
                contentBackgroundColor={bgColor}
                contentBorderColor="#000"
                shadowColor={PAGE.rewards.primary[0]}
                contentBorderRadius={15}
                shadowBorderRadius={15}
              >
                <View style={styles.rewardCard}>
                  <View style={styles.pointsBadge}>
                    <Image
                      source={SYSTEM_ICONS.reward}
                      style={{ width: 11, height: 11, tintColor: COLORS.Rewards }}
                    />
                    <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>
                      {reward.costPoints} pts
                    </Text>
                  </View>

                  <View style={styles.imageContainer}>
                    {reward.photoUri ? (
                      <Image source={{ uri: reward.photoUri }} style={styles.cardImage} />
                    ) : (
                      <View style={[styles.cardImage, {
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: lightenColor(bgColor, 0.15),
                      }]}>
                        <Image
                          source={SYSTEM_ICONS.gift}
                          style={{ width: 40, height: 40, tintColor: COLORS.Rewards }}
                        />
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardName} numberOfLines={1}>
                    {reward.name}
                  </Text>

                  <View style={styles.tagsContainer}>
                    {(reward.tags ?? []).slice(0, 2).map(tag => (
                      <View key={tag} style={styles.tag}>
                        <Text style={{ fontSize: 8, fontFamily: 'label' }}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ShadowBox>
            </View>

            {/* link */}
            {reward.link && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[globalStyles.label, { marginBottom: 8 }]}>LINK</Text>
                <Pressable onPress={handleOpenLink}>
                  <ShadowBox contentBackgroundColor="#fff" contentBorderRadius={10}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 8,
                      paddingHorizontal: 15,
                    }}>
                      <Image source={SYSTEM_ICONS.link} style={{ width: 15, height: 15 }} />
                      <Text
                        style={[globalStyles.label, { fontSize: 13, opacity: 1, color: '#2563EB', textDecorationLine: 'underline', flex: 1 }]}
                        numberOfLines={1}
                      >
                        {reward.link}
                      </Text>
                    </View>
                  </ShadowBox>
                </Pressable>
              </View>
            )}

            {/* notes */}
            {reward.notes && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[globalStyles.label, { marginBottom: 8 }]}>NOTES</Text>
                <View style={styles.notesBox}>
                  <Text style={[globalStyles.label, { fontSize: 13, lineHeight: 20, opacity: 1 }]}>
                    {reward.notes}
                  </Text>
                </View>
              </View>
            )}

            {/* details */}
            <View style={{ marginBottom: 10 }}>
              <Text style={[globalStyles.label, { marginBottom: 8 }]}>DETAILS</Text>
              <View style={styles.detailRow}>
                <Text style={[globalStyles.label, { fontSize: 13 }]}>Added</Text>
                <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>{formatRewardDate(reward.dateAdded)}</Text>
              </View>
              {reward.recurring && reward.dateClaimed && (
                <View style={styles.detailRow}>
                  <Text style={[globalStyles.label, { fontSize: 13 }]}>Last redeemed</Text>
                  <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>{formatRewardDate(reward.dateClaimed)}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={[globalStyles.label, { fontSize: 13 }]}>Cost</Text>
                <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>
                  ${reward.costDollars.toFixed(2)} ({reward.costPoints} points)
                </Text>
              </View>
              {reward.isClaimed && reward.dateClaimed && (
                <View style={styles.detailRow}>
                  <Text style={[globalStyles.label, { fontSize: 13 }]}>Claimed</Text>
                  <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>{formatRewardDate(reward.dateClaimed)}</Text>
                </View>
              )}
            </View>

            {/* more options — edit / delete */}
            <Pressable
              onPress={() => setMoreOptions(!moreOptions)}
              style={{ marginVertical: 20, alignSelf: 'center', opacity: 0.6 }}
              hitSlop={8}
            >
              <Text style={globalStyles.label}>{moreOptions ? 'Less options' : 'More options'}</Text>
            </Pressable>

            {moreOptions && (
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                <Pressable onPress={handleEdit} style={{ flex: 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Edit} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>Edit</Text>
                    </View>
                  </ShadowBox>
                </Pressable>

                <Pressable onPress={handleDelete} style={{ flex: 1 }}>
                  <ShadowBox contentBackgroundColor={BUTTON_COLORS.Delete} shadowBorderRadius={15}>
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>Delete</Text>
                    </View>
                  </ShadowBox>
                </Pressable>
              </View>
            )}
          </ScrollView>

          <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
            <Pressable onPress={onClose} style={{ flex: 1 }}>
              <ShadowBox contentBackgroundColor={BUTTON_COLORS.Done} shadowBorderRadius={15}>
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>Done</Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: PAGE.rewards.primary[0],
    maxHeight: '75%',
    width: '90%',
    alignSelf: 'center',
  },
  // card styles below mirror the wishlist card on the rewards index page —
  // keep them in sync if that card changes
  rewardCard: {
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    minHeight: 200,
  },
  imageContainer: {
    marginBottom: 8,
  },
  cardImage: {
    width: 100,
    height: 100,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 4,
  },
  cardName: {
    fontFamily: 'p2',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 5,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255, 243, 220, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 137, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
  notesBox: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
});
