import { globalStyles } from '@/styles';
import { BUTTON_COLORS, COLORS } from '@/constants/colors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Habit } from '@/types/Habit';
import { Reward } from '@/types/Reward';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { formatDateHeader } from '@/utils/dateUtils';

interface Props {
  visible: boolean;
  onClose: () => void;
  type: 'available' | 'total' | 'redeemed';
  totalPoints: number;
  redeemedPoints: number;
  rewards: Reward[];
  recentHabits?: Habit[];
  pointsResetDate?: string | null;
}

// One entry per unique habit after dedup + post-reset aggregation
interface HabitEntry {
  habit: Habit;
  postResetCount: number;       // number of completions strictly after resetDate
  totalEarned: number;          // postResetCount × rewardPoints
  lastCompletedDate: string | null; // most recent post-reset completion, derived from completionHistory
}

const PAGE_SIZE = 10;

export default function PointsHistoryModal({
  visible,
  onClose,
  type,
  totalPoints,
  redeemedPoints,
  rewards,
  recentHabits = [],
  pointsResetDate,
}: Props) {
  const slideAnim = useRef(new Animated.Value(500)).current;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (visible) {
      setVisibleCount(PAGE_SIZE); // reset pagination every time modal opens
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

  // Also reset pagination when the user switches tabs (available / total / redeemed)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [type]);

  // Include recurring rewards that have been claimed at least once (dateClaimed is set)
  // even though their isClaimed stays false so they remain in the wishlist
  const claimedRewards = rewards.filter(r => r.isClaimed || !!r.dateClaimed);

  // Dedup by habit.id, aggregate post-reset completions, sort newest-first
  const allHabitsWithPoints = useMemo<HabitEntry[]>(() => {
    const habitMap = new Map<string, HabitEntry>();

    for (const h of recentHabits) {
      if ((h.rewardPoints ?? 0) <= 0) continue;
      const history = h.completionHistory ?? [];

      // Filter to only post-reset dates, then derive the most recent from the array directly
      const postResetDates = pointsResetDate
        ? history.filter(d => d > pointsResetDate)
        : [...history];

      // keepUntil habits file completions on their cycle start, which can predate
      // the reset even when actually finished after it — credit the latest entry
      // when habit.lastCompletedDate shows a post-reset finish (mirrors
      // computeTotalPointsFromHabits)
      let carriedOverCredit = 0;
      if (pointsResetDate && h.keepUntil && h.lastCompletedDate && h.lastCompletedDate > pointsResetDate) {
        const latest = [...history].sort().at(-1);
        if (latest && latest <= pointsResetDate) {
          carriedOverCredit = 1;
        }
      }

      if (postResetDates.length === 0 && carriedOverCredit === 0) continue;

      const postResetCount = postResetDates.length + carriedOverCredit;
      // YYYY-MM-DD strings sort lexicographically = chronologically, so the last sorted entry is newest
      const lastCompletedDate = carriedOverCredit
        ? h.lastCompletedDate!
        : [...postResetDates].sort().at(-1) ?? null;

      if (habitMap.has(h.id)) {
        // Combine if somehow the same habit appears more than once in the list
        const existing = habitMap.get(h.id)!;
        existing.postResetCount += postResetCount;
        existing.totalEarned += postResetCount * (h.rewardPoints ?? 0);
        // Keep the more recent of the two lastCompletedDates
        if (lastCompletedDate && (!existing.lastCompletedDate || lastCompletedDate > existing.lastCompletedDate)) {
          existing.lastCompletedDate = lastCompletedDate;
        }
      } else {
        habitMap.set(h.id, {
          habit: h,
          postResetCount,
          totalEarned: postResetCount * (h.rewardPoints ?? 0),
          lastCompletedDate,
        });
      }
    }

    return Array.from(habitMap.values()).sort(
      (a, b) => (b.lastCompletedDate || '').localeCompare(a.lastCompletedDate || '')
    );
  }, [recentHabits, pointsResetDate]);

  // Only the first `visibleCount` items are rendered — FlatList's onEndReached grows this
  const visibleHabits = allHabitsWithPoints.slice(0, visibleCount);

  const handleLoadMore = useCallback(() => {
    setVisibleCount(c => Math.min(c + PAGE_SIZE, allHabitsWithPoints.length));
  }, [allHabitsWithPoints.length]);

  const getTitle = () => {
    switch (type) {
      case 'available': return 'Available Points';
      case 'total': return 'Total Earned';
      case 'redeemed': return 'Redeemed Points';
    }
  };

  // ─── Habit card rendered inside FlatList ─────────────────────────────────────
  const renderHabitItem = useCallback(({ item }: { item: HabitEntry }) => {
    const { habit, postResetCount, totalEarned, lastCompletedDate } = item;
    const showStreak = (habit.streak ?? 0) >= 3;

    console.log(lastCompletedDate, habit.lastCompletedDate, habit.completionHistory);

    return (
      <ShadowBox
        contentBackgroundColor={habit.pathColor || COLORS.Primary}
        shadowOffset={{ x: 0, y: 0 }}
        style={{ marginBottom: 10 }}
      >
        <View style={s.habitCard}>
          {/* icon */}
          <View style={s.iconContainer}>
            {HABIT_ICONS[habit.icon] && (
              <Image source={HABIT_ICONS[habit.icon]} style={s.iconImage} />
            )}
          </View>

          {/* name + badges + date */}
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[globalStyles.body, { fontSize: 15 }]}>{habit.name}</Text>

            <View style={s.badgesRow}>
              {/* points-per-completion badge */}
              {!!habit.rewardPoints && habit.rewardPoints > 0 && (
                <View style={[s.badge, s.pointsBadge]}>
                  <Image
                    source={SYSTEM_ICONS.reward}
                    style={{ width: 12, height: 12, tintColor: COLORS.Rewards }}
                  />
                  <Text style={s.badgeText}>{totalEarned} pts</Text>
                </View>
              )}

              {/* last completed date — derived from completionHistory */}
              {lastCompletedDate && (
                <View style={[s.badge, s.dateBadge]}>
                  <Text style={[globalStyles.label, { fontSize: 10, marginTop: 1, opacity: 1 }]}>
                    {formatDateHeader(new Date(lastCompletedDate)).toUpperCase()}
                  </Text>
                </View>
              )}

              {/* ×N completions badge — only shown when completed more than once */}
              {postResetCount > 1 && (
                <View style={[s.badge, s.XPBadge]}>
                  <Image
                    source={SYSTEM_ICONS.star}
                    style={{ width: 12, height: 12, tintColor: COLORS.Star }}
                  />
                  <Text style={[s.badgeText]}>x{postResetCount}</Text>
                </View>
              )}

              {/* streak badge */}
              {showStreak && (
                <View style={[s.badge, s.streakBadge]}>
                  <Image source={SYSTEM_ICONS.fire} style={{ width: 12, height: 12 }} />
                  <Text style={[s.badgeText, { color: '#FF6B35', fontWeight: 'bold' }]}>
                    {habit.streak}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ShadowBox>
    );
  }, []);

  // ─── Empty state for available tab ───────────────────────────────────────────
  const renderAvailableEmpty = () => (
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
  );

  // ─── Total + Redeemed tabs (ScrollView-based) ───────────────────────────────
  const renderNonAvailableContent = () => {
    if (type === 'total') {
      const allTimeTotal = recentHabits.reduce((sum, h) => {
        return sum + (h.completionHistory?.length ?? 0) * (h.rewardPoints ?? 0);
      }, 0);

      return (
        <View style={{ gap: 12 }}>
          {/* Card 1 — current period (prominent) */}
          <ShadowBox
            shadowBorderRadius={15}
            contentBorderRadius={15}
            contentBorderColor="#000"
            shadowColor={COLORS.Rewards}
            shadowOffset={{ x: 0, y: 3 }}
          >
            <View style={{ padding: 20, alignItems: 'center', gap: 6 }}>
              <Text style={[globalStyles.label, { fontSize: 11, opacity: 1 }]}>

                {pointsResetDate ? 'EARNED THIS PERIOD' : 'TOTAL EARNED'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image source={SYSTEM_ICONS.reward} style={{ width: 22, height: 22, tintColor: COLORS.Rewards }} />
                <Text style={globalStyles.h1}>{totalPoints}</Text>
              </View>
            </View>
          </ShadowBox>

          {/* Card 2 — last reset date */}
          <ShadowBox shadowOffset={{ x: 0, y: 0 }} contentBackgroundColor={'#FFC7A0'}>
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={globalStyles.body1}>Last reset</Text>
              <View style={[s.badge, s.dateBadge]}>
                <Text style={[globalStyles.label, { fontSize: 11, opacity: 1 }]}>
                  {pointsResetDate
                    ? formatDateHeader(new Date(pointsResetDate)).toUpperCase()
                    : 'NEVER RESET'}
                </Text>
              </View>
            </View>
          </ShadowBox>

          {/* Card 3 — all-time total */}
          <ShadowBox shadowOffset={{ x: 0, y: 0 }} contentBackgroundColor={'#7FD1AE'}>
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={globalStyles.body1}>All-time total</Text>
              <View style={[s.badge, s.pointsBadge]}>
                <Image source={SYSTEM_ICONS.reward} style={{ width: 12, height: 12, tintColor: COLORS.Rewards }} />
                <Text style={s.badgeText}>{allTimeTotal} pts</Text>
              </View>
            </View>
          </ShadowBox>
        </View>
      );
    }

    if (type === 'redeemed') {
      return (
        <View>
          {claimedRewards.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={globalStyles.body}>No rewards redeemed yet!</Text>
              <Text style={[globalStyles.body1, { color: '#666', textAlign: 'center', marginTop: 5, fontSize: 12 }]}>
                Complete habits to earn points, then redeem them for rewards.
              </Text>
            </View>
          ) : (
            <View>
              {claimedRewards.map((reward) => {
                const bgColor = reward.backgroundColor || '#FFF3D0';
                return (
                  <ShadowBox
                    key={reward.id}
                    shadowBorderRadius={15}
                    contentBorderRadius={15}
                    contentBorderColor="#000"
                    contentBackgroundColor={bgColor}
                    shadowColor={COLORS.Rewards}
                    shadowOffset={{ x: 0, y: 3 }}
                    style={{ marginBottom: 12 }}
                  >
                    <View style={s.claimedCard}>
                      {/* image */}
                      <View style={s.miniImageContainer}>
                        {reward.photoUri ? (
                          <Image source={{ uri: reward.photoUri }} style={s.miniImage} />
                        ) : (
                          <View style={[s.miniImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor }]}>
                            <Image source={SYSTEM_ICONS.gift} style={{ width: 28, height: 28, tintColor: '#FFD581' }} />
                          </View>
                        )}
                      </View>

                      {/* content */}
                      <View style={{ flex: 1, gap: 6 }}>
                        <Text style={[globalStyles.body1, { fontSize: 14 }]} numberOfLines={1}>{reward.name}</Text>
                        <View style={s.badgesRow}>
                          {reward.recurring && (
                            <View style={[s.badge, s.dateBadge]}>
                              <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>↻ Recurring</Text>
                            </View>
                          )}
                          <View style={[s.badge, s.pointsBadge]}>
                            <Image source={SYSTEM_ICONS.reward} style={{ width: 12, height: 12, tintColor: COLORS.Rewards }} />
                            <Text style={s.badgeText}>-{reward.costPoints} pts</Text>
                          </View>
                          {reward.dateClaimed && (
                            <View style={[s.badge, s.dateBadge]}>
                              <Text style={[globalStyles.label, { fontSize: 10, opacity: 1, marginTop: 1 }]}>
                                {formatDateHeader(new Date(reward.dateClaimed)).toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        {reward.tags && reward.tags.length > 0 && (
                          <View style={s.badgesRow}>
                            {reward.tags.slice(0, 3).map(tag => (
                              <View key={tag} style={s.miniTag}>
                                <Text style={{ fontSize: 8, fontFamily: 'label' }}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    </View>
                  </ShadowBox>
                );
              })}
            </View>
          )}
          <ShadowBox
            contentBorderColor="#000"
            shadowColor={COLORS.Rewards}
            shadowOffset={{ x: 0, y: 3 }}
            style={{ marginTop: 4 }}
          >
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={globalStyles.body1}>Total redeemed</Text>
              <View style={[s.badge, s.pointsBadge]}>
                <Image source={SYSTEM_ICONS.reward} style={{ width: 12, height: 12, tintColor: COLORS.Rewards }} />
                <Text style={s.badgeText}>{redeemedPoints} pts</Text>
              </View>
            </View>
          </ShadowBox>
        </View>
      );
    }

    return null;
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="none" transparent>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback onPress={() => { }}>
            <Animated.View style={[s.modal, { transform: [{ translateY: slideAnim }] }]}>

              {/* header */}
              <View style={s.header}>
                <Text style={globalStyles.h3}>{getTitle()}</Text>
                <Pressable onPress={onClose} style={s.closeButton}>
                  <Text style={[globalStyles.h3, { color: '#666' }]}>✕</Text>
                </Pressable>
              </View>

              {/* content — FlatList for 'available' (lazy), ScrollView for everything else */}
              {type === 'available' ? (
                <FlatList
                  data={visibleHabits}
                  renderItem={renderHabitItem}
                  keyExtractor={({ habit }) => habit.id}
                  onEndReached={handleLoadMore}
                  onEndReachedThreshold={0.3}
                  contentContainerStyle={{ padding: 20, paddingBottom: 10 }}
                  ListEmptyComponent={renderAvailableEmpty}
                  ListFooterComponent={
                    visibleCount < allHabitsWithPoints.length
                      ? <ActivityIndicator size="small" color={COLORS.Primary} style={{ marginVertical: 10 }} />
                      : null
                  }
                />
              ) : (
                <ScrollView contentContainerStyle={{ padding: 20 }}>
                  {renderNonAvailableContent()}
                </ScrollView>
              )}

              {/* footer */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 20, gap: 10, justifyContent: 'center' }}>
                <Pressable style={{ flex: 1, maxWidth: 100, alignSelf: 'center' }} onPress={onClose}>
                  <ShadowBox
                    contentBackgroundColor={BUTTON_COLORS.Done}
                    shadowBorderRadius={15}
                  >
                    <View style={{ paddingVertical: 6 }}>
                      <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                        Done
                      </Text>
                    </View>
                  </ShadowBox>
                </Pressable>
              </View>

            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
  // ─── Habit card ──────────────────────────────────────────────────────────────
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconImage: {
    width: 40,
    height: 40,
    resizeMode: 'contain',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: 'label',
  },
  dateBadge: {
    backgroundColor: '#FAFAEE',
    borderColor: '#FFC7A0',
  },
  pointsBadge: {
    backgroundColor: COLORS.RewardsBackground,
    borderColor: COLORS.RewardsAccent,
  },
  XPBadge: {
    backgroundColor: COLORS.XPAccent,
    borderColor: COLORS.Star,
  },
  countBadge: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
  },
  streakBadge: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: '#FF6B35',
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
  // ─── Total tab ───────────────────────────────────────────────────────────────
  bigNumber: {
    fontFamily: 'p2',
    fontSize: 48,
    color: '#000',
  },
  // ─── Redeemed tab ────────────────────────────────────────────────────────────
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  claimedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
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
  // ─── Footer ──────────────────────────────────────────────────────────────────
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
