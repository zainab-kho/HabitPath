import { globalStyles, buttonStyles } from '@/styles';
import { COLORS } from '@/constants/colors';
import React, { useEffect, useRef } from 'react';
import { Animated, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Habit } from '@/types/Habit';
import { Reward } from '@/types/Reward';
import { SYSTEM_ICONS } from '@/constants/icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: 'available' | 'total' | 'redeemed';
  totalPoints: number;
  redeemedPoints: number;
  rewards: Reward[];
  recentHabits?: Habit[];
}

export default function PointsHistoryModal({
  visible,
  onClose,
  type,
  totalPoints,
  redeemedPoints,
  rewards,
  recentHabits = [],
}: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      slideAnim.setValue(500);
    }
  }, [visible]);

  const claimedRewards = rewards.filter(r => r.isClaimed);

  const habitsWithPoints = recentHabits
    .filter(h => (h.completionHistory?.length ?? 0) > 0 && (h.rewardPoints ?? 0) > 0)
    .sort((a, b) => {
      const dateA = a.lastCompletedDate || '';
      const dateB = b.lastCompletedDate || '';
      return dateB.localeCompare(dateA);
    });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getTitle = () => {
    switch (type) {
      case 'available': return 'Available Points';
      case 'total': return 'Total Earned';
      case 'redeemed': return 'Redeemed Points';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'available':
        return (
          <View>
            {habitsWithPoints.length === 0 ? (
              <View style={{
                padding: 30,
                backgroundColor: '#fff',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: '#000',
                shadowColor: '#000',
                shadowOffset: { width: 3, height: 3 },
                shadowOpacity: 1,
                shadowRadius: 0,
                elevation: 5,
                alignItems: 'center',
                margin: 10,
              }}>
                <Text style={[globalStyles.body, { textAlign: 'center', marginBottom: 8 }]}>
                  No points available yet.
                </Text>
                <Text style={[globalStyles.label, { textAlign: 'center', opacity: 1, fontSize: 13 }]}>
                  Complete habits with reward points assigned to start earning!
                </Text>
              </View>
            ) : (
              <View style={s.habitsList}>
                {habitsWithPoints.map((habit, index) => (
                  <View key={`${habit.id}-${index}`} style={s.habitItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={globalStyles.body1}>{habit.name}</Text>
                      {habit.lastCompletedDate && (
                        <Text style={[globalStyles.label, { fontSize: 11, marginTop: 3 }]}>
                          {formatDate(habit.lastCompletedDate)}
                        </Text>
                      )}
                    </View>
                    <View style={s.pointsBubble}>
                      <Image
                        source={SYSTEM_ICONS.reward}
                        style={{ width: 12, height: 12 }}
                      />
                      <Text style={[globalStyles.label, { color: 'black', fontSize: 12, opacity: 1 }]}>
                        +{habit.rewardPoints}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'total':
        return (
          <View>
            <Text style={[globalStyles.label, { marginBottom: 15, opacity: 1, fontSize: 13 }]}>
              All-time points earned from completing habits. This number never decreases.
            </Text>
            <View style={s.statBox}>
              <Text style={s.bigNumber}>{totalPoints}</Text>
              <Text style={[globalStyles.label, { fontSize: 12 }]}>Total Points Earned</Text>
            </View>
            <Text style={[globalStyles.body1, { marginBottom: 8 }]}>How you earned these:</Text>
            <Text style={[globalStyles.label, { fontSize: 13, opacity: 1, lineHeight: 20 }]}>
              Every time you complete a habit with reward points assigned, those points are added to your total. Keep completing habits to grow this number!
            </Text>
          </View>
        );

      case 'redeemed':
        return (
          <View>
            <Text style={[globalStyles.label, { marginBottom: 15, opacity: 1, fontSize: 13 }]}>
              Points you've spent on rewards. Here's what you've claimed:
            </Text>
            {claimedRewards.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={globalStyles.body1}>No rewards redeemed yet!</Text>
                <Text style={[globalStyles.label, { textAlign: 'center', marginTop: 5, fontSize: 12 }]}>
                  Complete habits to earn points, then redeem them for rewards.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {claimedRewards.map((reward) => (
                  <View key={reward.id} style={[s.rewardPreview, { backgroundColor: reward.backgroundColor || '#FFFFFF' }]}>
                    <View style={s.miniImageContainer}>
                      {reward.photoUri ? (
                        <Image source={{ uri: reward.photoUri }} style={s.miniImage} />
                      ) : (
                        <View style={[s.miniImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: reward.backgroundColor || '#FFF3D0' }]}>
                          <Image
                            source={SYSTEM_ICONS.gift}
                            style={{ width: 28, height: 28, tintColor: '#FFD581' }}
                          />
                        </View>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={globalStyles.body1}>{reward.name}</Text>
                      <Text style={[globalStyles.label, { color: '#FF6B6B', fontSize: 11, opacity: 1 }]}>
                        -{reward.costPoints} points
                      </Text>
                      {reward.dateClaimed && (
                        <Text style={[globalStyles.label, { fontSize: 10, marginTop: 2 }]}>
                          Claimed: {reward.dateClaimed}
                        </Text>
                      )}
                    </View>
                    {reward.tags && reward.tags.length > 0 && (
                      <View style={{ gap: 3 }}>
                        {reward.tags.slice(0, 2).map(tag => (
                          <View key={tag} style={s.miniTag}>
                            <Text style={{ fontSize: 8, fontFamily: 'label' }}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={s.totalBox}>
              <Text style={globalStyles.body}>Total Redeemed: {redeemedPoints} points</Text>
            </View>
          </View>
        );
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={s.overlay}>
        <Animated.View style={[s.modal, { transform: [{ translateY: slideAnim }] }]}>
          <View style={s.header}>
            <Text style={globalStyles.h3}>{getTitle()}</Text>
            <Pressable onPress={onClose} style={s.closeButton}>
              <Text style={{ fontSize: 22, color: '#666' }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {renderContent()}
          </ScrollView>

          <View style={{ borderTopWidth: 1, borderTopColor: '#000' }}>
            <Pressable onPress={onClose} style={s.doneButton}>
              <Text style={globalStyles.body}>Done</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  habitsList: {
    marginBottom: 20,
    gap: 8,
  },
  habitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  pointsBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFD581',
  },
  statBox: {
    backgroundColor: '#FFF3D0',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD581',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  bigNumber: {
    fontFamily: 'p2',
    fontSize: 48,
    color: '#000',
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  rewardPreview: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  miniImageContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  miniImage: {
    width: 55,
    height: 55,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 4,
  },
  miniTag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  totalBox: {
    backgroundColor: '#FFD581',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#000',
    marginTop: 10,
    alignItems: 'center',
  },
  doneButton: {
    backgroundColor: '#FFD581',
    width: 200,
    padding: 8,
    margin: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#000',
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
});
