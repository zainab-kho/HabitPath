import { globalStyles } from '@/styles';
import { BUTTON_COLORS, COLORS, PAGE } from '@/constants/colors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
// RN's ScrollView/FlatList don't scroll inside these modals — use gesture-handler's
import { FlatList, ScrollView } from 'react-native-gesture-handler';
import { Habit } from '@/types/Habit';
import { Reward } from '@/types/Reward';
import { HABIT_ICONS, SYSTEM_ICONS } from '@/constants/icons';
import ShadowBox from '@/ui/ShadowBox';
import { formatDateHeader, parseLocalDate } from '@/utils/dateUtils';
import { lightenColor } from '@/utils';

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

// One redemption of a reward — recurring rewards produce one entry per claim
interface ClaimEntry {
  reward: Reward;
  date: string | null; // claim date; null for legacy claimed rewards without one
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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [showAllTime, setShowAllTime] = useState(false);

  useEffect(() => {
    if (visible) {
      setVisibleCount(PAGE_SIZE); // reset pagination every time modal opens
      setShowAllTime(false);
    }
  }, [visible]);

  // Also reset pagination when the user switches tabs (available / total / redeemed)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setShowAllTime(false);
  }, [type]);

  // one entry per redemption — recurring rewards claimed N times show up N times.
  // includes recurring rewards whose isClaimed stays false so they remain in the
  // wishlist; falls back to dateClaimed for rewards claimed before claimHistory existed
  const claimEntries: ClaimEntry[] = rewards
    .filter(r => r.isClaimed || !!r.dateClaimed)
    .flatMap(r => {
      const dates: (string | null)[] = r.claimHistory?.length
        ? r.claimHistory
        : r.dateClaimed ? [r.dateClaimed] : [null];
      return dates.map(date => ({ reward: r, date }));
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  // split into current period vs before the last points reset
  const currentClaimed = pointsResetDate
    ? claimEntries.filter(e => e.date && e.date > pointsResetDate)
    : claimEntries;
  const pastClaimed = pointsResetDate
    ? claimEntries.filter(e => !e.date || e.date <= pointsResetDate)
    : [];

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
                    {formatDateHeader(parseLocalDate(lastCompletedDate)).toUpperCase()}
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
                    ? formatDateHeader(parseLocalDate(pointsResetDate)).toUpperCase()
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
          {/* total redeemed summary */}
          <ShadowBox
            contentBorderColor="#000"
            shadowColor={COLORS.Rewards}
            shadowOffset={{ x: 0, y: 3 }}
            style={{ marginBottom: 20 }}
          >
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={globalStyles.body1}>Total redeemed</Text>
              <View style={[s.badge, s.pointsBadge]}>
                <Image source={SYSTEM_ICONS.reward} style={{ width: 12, height: 12, tintColor: COLORS.Rewards }} />
                <Text style={s.badgeText}>{redeemedPoints} pts</Text>
              </View>
            </View>
          </ShadowBox>

          {currentClaimed.length === 0 && pastClaimed.length === 0 ? (
            <View style={s.emptyBox}>
              <Text style={globalStyles.body}>No rewards redeemed yet!</Text>
              <Text style={[globalStyles.body1, { color: '#666', textAlign: 'center', marginTop: 5, fontSize: 12 }]}>
                Complete habits to earn points, then redeem them for rewards.
              </Text>
            </View>
          ) : (
            <>
              {currentClaimed.length === 0 ? (
                <Text style={[globalStyles.label, { textAlign: 'center', marginBottom: 15 }]}>
                  Nothing redeemed since the last reset
                </Text>
              ) : (
                <View style={s.grid}>
                  {currentClaimed.map(renderClaimedCard)}
                </View>
              )}

              {/* rewards claimed before the last reset, hidden behind a toggle */}
              {pastClaimed.length > 0 && (
                <>
                  <Pressable
                    onPress={() => setShowAllTime(!showAllTime)} hitSlop={8}
                    style={{
                      margin: 15,
                      alignSelf: 'center',
                      opacity: 0.6,
                    }}>
                    <Text style={globalStyles.label}>
                      {showAllTime ? 'Hide past rewards' : `Show all time (${pastClaimed.length} more)`}
                    </Text>
                  </Pressable>

                  {showAllTime && (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
                        <Text style={[globalStyles.label, { fontSize: 10 }]}>BEFORE LAST RESET</Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                      </View>
                      <View style={s.grid}>
                        {pastClaimed.map(renderClaimedCard)}
                      </View>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </View>
      );
    }

    return null;
  };

  // one wishlist-style card + claimed-date bubble, used by both redeemed sections
  const renderClaimedCard = ({ reward, date }: ClaimEntry, index: number) => {
    const bgColor = reward.backgroundColor || '#FFF3D0';
    return (
      <View key={`${reward.id}-${date ?? 'legacy'}-${index}`} style={s.gridItem}>
        <ShadowBox
          contentBackgroundColor={bgColor}
          contentBorderColor="#000"
          shadowColor={PAGE.rewards.primary[0]}
          contentBorderRadius={15}
          shadowBorderRadius={15}
        >
          <View style={s.rewardCard}>
            <View style={s.cardPointsBadge}>
              <Image
                source={SYSTEM_ICONS.reward}
                style={{ width: 11, height: 11, tintColor: COLORS.Rewards }}
              />
              <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>
                {reward.costPoints} pts
              </Text>
            </View>

            <View style={{ marginBottom: 8 }}>
              {reward.photoUri ? (
                <Image source={{ uri: reward.photoUri }} style={s.cardImage} />
              ) : (
                <View style={[s.cardImage, {
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

            <Text style={s.cardName} numberOfLines={1}>
              {reward.name}
            </Text>

            <View style={s.cardTagsContainer}>
              {(reward.tags ?? []).slice(0, 2).map(tag => (
                <View key={tag} style={s.cardTag}>
                  <Text style={{ fontSize: 8, fontFamily: 'label' }}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        </ShadowBox>

        {/* claimed date bubble under the card */}
        {date && (
          <View style={[s.badge, s.dateBadge, { alignSelf: 'center', marginTop: 8 }]}>
            <Text style={[globalStyles.label, { fontSize: 9, opacity: 1 }]}>
              {reward.recurring ? '↻ ' : ''}{formatDateHeader(parseLocalDate(date)).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={(e) => e.stopPropagation()}>

          <View style={{ marginTop: 20 }}>
            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 20 }]}>
              {getTitle()}
            </Text>
          </View>

          {/* content — FlatList for 'available' (lazy), ScrollView for everything else */}
          {type === 'available' ? (
            <FlatList
              data={visibleHabits}
              renderItem={renderHabitItem}
              keyExtractor={({ habit }) => habit.id}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.3}
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderAvailableEmpty}
              ListFooterComponent={
                visibleCount < allHabitsWithPoints.length
                  ? <ActivityIndicator size="small" color={COLORS.Primary} style={{ marginVertical: 10 }} />
                  : null
              }
            />
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}
              showsVerticalScrollIndicator={false}
            >
              {renderNonAvailableContent()}
            </ScrollView>
          )}

          {/* footer */}
          <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10 }}>
            <Pressable style={{ flex: 1 }} onPress={onClose}>
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

const s = StyleSheet.create({
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
    backgroundColor: '#f7cec8',
    borderColor: '#ff8a36',
  },
  pointsBadge: {
    backgroundColor: COLORS.RewardsBackground,
    borderColor: COLORS.RewardsAccent,
  },
  XPBadge: {
    backgroundColor: COLORS.XPAccent,
    borderColor: COLORS.Star,
  },
  streakBadge: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: '#FF6B35',
  },
  // ─── Redeemed tab ────────────────────────────────────────────────────────────
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  // grid + card styles mirror the wishlist card on the rewards index page —
  // keep them in sync if that card changes
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
    marginBottom: 15,
  },
  rewardCard: {
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    minHeight: 200,
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
  cardPointsBadge: {
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
  cardTagsContainer: {
    flexDirection: 'row',
    gap: 3,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  cardTag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
  },
});
