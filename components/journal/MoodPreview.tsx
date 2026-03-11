// @/components/journal/MoodPreview.tsx
import { MOOD_COLORS, PAGE } from '@/constants/colors';
import { globalStyles } from '@/styles';
import { JournalEntry } from '@/types/JournalEntry';
import ShadowBox from '@/ui/ShadowBox';
import { formatLocalDate } from '@/utils/dateUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface MoodPreviewProps {
  entries: JournalEntry[];
}

export default function MoodPreview({ entries }: MoodPreviewProps) {
  const router = useRouter();
  const currentYear = new Date().getFullYear();

  // get last 3 months
  const today = new Date();
  const monthsToShow = 3;
  const months: Date[] = [];

  for (let i = monthsToShow - 1; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(date);
  }

  // create a map of date -> moods (array to handle multiple entries per day)
  // Use local timezone for date keys
  const moodsByDate = React.useMemo(() => {
    const map: Record<string, string[]> = {};
    entries.forEach(entry => {
      const date = new Date(entry.date);
      const dateStr = formatLocalDate(date);
      if (entry.mood) {
        if (!map[dateStr]) {
          map[dateStr] = [];
        }
        map[dateStr].push(entry.mood);
      }
    });
    return map;
  }, [entries]);

  const renderDayCell = (moods: string[] | undefined) => {
  if (!moods || moods.length === 0) {
    return <View style={[styles.dayCell, { backgroundColor: '#f0f0f0ff' }]} />;
  }

  const unique = [...moods].reverse().slice(0, 6); // reverse if you want newest first visually
  const colors = unique.map(m => MOOD_COLORS[m as keyof typeof MOOD_COLORS]);

  if (colors.length === 1) {
    return <View style={[styles.dayCell, { backgroundColor: colors[0] }]} />;
  }

  // 2–3 moods: keep your original stripes
  if (colors.length <= 3) {
    return (
      <View style={styles.dayCell}>
        {colors.map((c, idx) => (
          <View key={idx} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
    );
  }

  // 4–6 moods: 3 on top, remaining on bottom
  const top = colors.slice(0, 3);
  const bottom = colors.slice(3); // length 1..3

  return (
    <View style={[styles.dayCell, { flexDirection: 'column' }]}>
      {/* top row */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {top.map((c, idx) => (
          <View key={idx} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>

      {/* bottom row */}
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {bottom.map((c, idx) => (
          <View key={idx} style={{ flex: 1, backgroundColor: c }} />
        ))}
      </View>
    </View>
  );
};

  return (
    <ShadowBox
      shadowColor={PAGE.journal.border[0]}
      style={{ marginBottom: 20 }}
    >
      <Pressable
        style={styles.container}
        onPress={() => router.push('/tabs/more/journal/YearInPixels' as any)}
      >
        <View style={styles.header}>
          <Text style={globalStyles.body}>Mood Tracker</Text>
        </View>

        <View style={styles.monthsContainer}>
          {months.map((monthDate, idx) => {
            const monthIndex = monthDate.getMonth();
            const year = monthDate.getFullYear();
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

            // Get the day of week for the 1st of the month (0 = Sunday, 6 = Saturday)
            const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();

            const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });

            return (
              <View key={idx} style={styles.monthColumn}>
                <Text style={globalStyles.label}>{monthName}</Text>

                <View style={styles.daysGrid}>
                  {/* Empty cells before the first day of the month */}
                  {Array.from({ length: firstDayOfWeek }, (_, emptyIdx) => (
                    <View key={`empty-${emptyIdx}`} style={styles.emptyCell} />
                  ))}

                  {/* Actual days of the month */}
                  {Array.from({ length: daysInMonth }, (_, dayIndex) => {
                    const date = new Date(year, monthIndex, dayIndex + 1);
                    const dateStr = formatLocalDate(date);
                    const moods = moodsByDate[dateStr];

                    return (
                      <View key={dayIndex}>
                        {renderDayCell(moods)}
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* Entry count */}
        <Text style={styles.stats}>
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'} in {currentYear}
        </Text>
      </Pressable>
    </ShadowBox>
  );
}

const CELL_SIZE = 10;

const styles = StyleSheet.create({
  container: {
    padding: 15,
  },
  header: {
    alignSelf: 'center',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'p2',
    fontSize: 16,
    alignSelf: 'center',
  },
  monthsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 11,
    fontFamily: 'p1',
    marginBottom: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 1,
    maxWidth: 90,
  },
  emptyCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    // invisible spacer for alignment
  },
  dayCell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderWidth: 1,
    borderColor: '#000',
    overflow: 'hidden', // for gradient/stripes
    flexDirection: 'row', // for stripes option
  },
  stats: {
    fontSize: 10,
    fontFamily: 'label',
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
});