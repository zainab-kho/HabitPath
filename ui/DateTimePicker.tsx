import { BUTTON_COLORS, COLORS } from '@/constants/colors'
import { TIME_OPTIONS } from '@/constants/habits'
import { SYSTEM_ICONS } from '@/constants/icons'
import { buttonStyles, globalStyles } from '@/styles'
import React, { useEffect, useState } from 'react'
import {
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'

interface DateTimePickerProps {
  visible: boolean
  onClose: () => void
  onSave: (time: string, date: Date, prettyDate: string) => void
  initialTime?: string
  initialDate?: Date
}


export default function DateTimePicker({
  visible,
  onClose,
  onSave,
  initialTime = 'Anytime',
  initialDate = new Date(),
}: DateTimePickerProps) {
  const [selectedTime, setSelectedTime] = useState(initialTime)
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [showCalendar, setShowCalendar] = useState(false)

  console.log('DateTimePicker render, visible:', visible)

  useEffect(() => {
    console.log('DateTimePicker visible changed to:', visible)
    if (visible) {
      setSelectedTime(initialTime)
      setSelectedDate(initialDate)
      setShowCalendar(false)
    }
  }, [visible, initialTime, initialDate])

  const handleClose = () => {
    Keyboard.dismiss()
    onClose()
  }

  const handleSave = () => {
    const prettyDate = getPrettyDate(selectedDate)
    onSave(selectedTime, selectedDate, prettyDate)
    handleClose()
  }

  const getPrettyDate = (date: Date) => {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Reset time for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())

    if (dateOnly.getTime() === todayOnly.getTime()) return 'Today'
    if (dateOnly.getTime() === tomorrowOnly.getTime()) return 'Tomorrow'

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const selectToday = () => {
    setSelectedDate(new Date())
    setShowCalendar(false)
  }

  const selectTomorrow = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    setSelectedDate(tomorrow)
    setShowCalendar(false)
  }

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.sheetContainer} pointerEvents="box-none">
          <Pressable onPress={() => { }} style={styles.sheetContainer}>
            <View style={styles.sheet}>

              <Text style={[globalStyles.h2, styles.title]}>
                {showCalendar ? 'Select Date' : 'Date & Time'}
              </Text>

              {!showCalendar ? (
                <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
                  {/* time Section */}
                  <View style={styles.section}>
                    <Text style={[globalStyles.label]}>TIME</Text>
                    <View style={styles.optionsGrid}>
                      {TIME_OPTIONS.map((time) => (
                        <Pressable
                          key={time}
                          style={[
                            styles.optionButton,
                            selectedTime === time && styles.optionButtonSelected,
                          ]}
                          onPress={() => setSelectedTime(time)}
                        >
                          <Text
                            style={[
                              globalStyles.body,
                              styles.optionText,
                              selectedTime === time && styles.optionTextSelected,
                            ]}
                          >
                            {time}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* date Section */}
                  <View style={styles.section}>
                    <Text style={[globalStyles.label]}>DATE</Text>
                    <View style={styles.optionsGrid}>
                      <Pressable
                        style={[
                          styles.optionButton,
                          getPrettyDate(selectedDate) === 'Today' && styles.optionButtonSelected,
                        ]}
                        onPress={selectToday}
                      >
                        <Text
                          style={[
                            globalStyles.body,
                            styles.optionText,
                            getPrettyDate(selectedDate) === 'Today' && styles.optionTextSelected,
                          ]}
                        >
                          Today
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[
                          styles.optionButton,
                          getPrettyDate(selectedDate) === 'Tomorrow' && styles.optionButtonSelected,
                        ]}
                        onPress={selectTomorrow}
                      >
                        <Text
                          style={[
                            globalStyles.body,
                            styles.optionText,
                            getPrettyDate(selectedDate) === 'Tomorrow' && styles.optionTextSelected,
                          ]}
                        >
                          Tomorrow
                        </Text>
                      </Pressable>

                      <Pressable
                        style={[styles.optionButton, styles.customButton]}
                        onPress={() => setShowCalendar(true)}
                      >
                        <Image
                          source={SYSTEM_ICONS.calendar}
                          style={{ width: 16, height: 16, }}
                        />
                        <Text style={[globalStyles.body, styles.optionText,]}>
                          Custom
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </ScrollView>
              ) : (
                <Calendar
                  selectedDate={selectedDate}
                  onSelectDate={(date) => {
                    setSelectedDate(date)
                    setShowCalendar(false)
                  }}
                  onBack={() => setShowCalendar(false)}
                />
              )}

              {/* Action Buttons */}
              <View style={styles.actions}>
                <Pressable style={buttonStyles.button} onPress={handleClose}>
                  <Text style={[globalStyles.body]}>Cancel</Text>
                </Pressable>
                <Pressable style={[buttonStyles.button, { backgroundColor: BUTTON_COLORS.Done }]} onPress={handleSave}>
                  <Text style={[globalStyles.body]}>Save</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

// ============================================================================
// CUSTOM CALENDAR COMPONENT
// ============================================================================

interface CalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onBack: () => void
}

function Calendar({ selectedDate, onSelectDate, onBack }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek }
  }

  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth)

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const selectDate = (day: number) => {
    const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    onSelectDate(newDate)
  }

  const isSelectedDate = (day: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    )
  }

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <View style={calendarStyles.container}>
      {/* Month Header */}
      <View style={calendarStyles.header}>
        <Pressable onPress={previousMonth} style={calendarStyles.navButton}>
          <Image source={SYSTEM_ICONS.sortLeft} style={calendarStyles.navIcon} />
        </Pressable>
        <Text style={[globalStyles.body, calendarStyles.monthText]}>{monthName}</Text>
        <Pressable onPress={nextMonth} style={calendarStyles.navButton}>
          <Image source={SYSTEM_ICONS.sortRight} style={calendarStyles.navIcon} />
        </Pressable>
      </View>

      {/* Weekday Headers */}
      <View style={calendarStyles.weekdays}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <Text key={i} style={[globalStyles.body, calendarStyles.weekdayText]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={calendarStyles.grid}>
        {/* Empty cells for days before month starts */}
        {Array.from({ length: startingDayOfWeek }).map((_, i) => (
          <View key={`empty-${i}`} style={calendarStyles.dayCell} />
        ))}

        {/* Days of the month */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const selected = isSelectedDate(day)
          return (
            <Pressable
              key={day}
              style={calendarStyles.dayCell}
              onPress={() => selectDate(day)}
            >
              <View
                style={[
                  calendarStyles.dayNumberWrapper,
                  selected && calendarStyles.selectedDay,
                ]}
              >
                <Text
                  style={[
                    globalStyles.body,
                    calendarStyles.dayText,
                    selected && calendarStyles.selectedDayText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      {/* Back Button */}
      <Pressable style={[buttonStyles.button, { backgroundColor: BUTTON_COLORS.Cancel }]} onPress={onBack}>
        <Text style={globalStyles.body}>Back to Options</Text>
      </Pressable>
    </View>
  )
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  sheetContainer: {
  },

  sheet: {
    backgroundColor: '#fff',
    borderWidth: 1,
    padding: 20,
    borderRadius: 20,
    width: '90%',
    alignSelf: 'center',

  },

  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },

  title: {
    textAlign: 'center',
    marginBottom: 20,
  },

  section: {
    marginBottom: 24,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#666',
  },

  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    margin: 3
  },

  optionButton: {
    borderWidth: 1,
    borderColor: COLORS.Primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#fff',
    shadowColor: COLORS.Primary,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
    minWidth: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },

  optionButtonSelected: {
    backgroundColor: COLORS.Primary,
    borderColor: '#000',
    shadowColor: '#000'
  },

  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  optionText: {
    fontSize: 13,
    textAlign: 'center',
  },

  optionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },

  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'flex-end'
  },

  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },

  saveButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
})

const calendarStyles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  navButton: {
    padding: 8,
  },

  navIcon: {
    width: 20,
    height: 20,
    tintColor: '#000',
  },

  monthText: {
    fontSize: 16,
    fontWeight: '600',
  },

  weekdays: {
    flexDirection: 'row',
    marginBottom: 12,
  },

  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  selectedDay: {
    backgroundColor: COLORS.Primary,
    borderRadius: 12,
  },

  dayText: {
    fontSize: 14,
  },

  selectedDayText: {
    color: '#fff',
    fontWeight: '600',
  },

  backButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.Primary,
    borderRadius: 12,
  },
  dayNumberWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
})