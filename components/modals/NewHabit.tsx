import { COLORS, PAGE } from '@/components/colors'
import { buttonStyles, globalStyles, uiStyles } from '@/styles'
import { LinearGradient } from 'expo-linear-gradient'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SYSTEM_ICONS } from '../icons'

interface NewHabitModalProps {
  visible: boolean
  onClose: () => void
  onSave: () => void
}

export default function NewHabitModal({
  visible,
  onClose,
  onSave,
}: NewHabitModalProps) {
  const scale = useRef(new Animated.Value(0.95)).current
  const modalOpacity = useRef(new Animated.Value(0)).current
  const overlayOpacity = useRef(new Animated.Value(0)).current

  const [habitName, setHabitName] = useState('');
  const [time, setTime] = useState('Anytime')
  const [startDate, setStartDate] = useState(new Date())
  const [frequency, setFrequency] = useState('None')
  const [reward, setReward] = useState(1)

  useEffect(() => {
    if (visible) {
      // Fade in overlay quickly, spring in modal
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 18,
          stiffness: 180,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      // Reset for next time
      overlayOpacity.setValue(0)
      modalOpacity.setValue(0)
      scale.setValue(0.95)
    }
  }, [visible])

  return (
    <Modal
      transparent
      visible={visible}
      // **TODO: make aniimation for overlay fade, and the card slide
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* animated overlay - fades in */}
      <Animated.View
        style={[
          styles.overlay,
          { opacity: overlayOpacity } // separate opacity for overlay
        ]}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        {/* modal content - springs in */}
        <Animated.View
          style={[
            styles.cardWrapper,
            {
              opacity: modalOpacity,
              transform: [{ scale }],
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <LinearGradient
            colors={PAGE.settings.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <View style={{ alignItems: 'center', marginBottom: 20, }}>
              <Text style={globalStyles.h3}>New Habit</Text>
            </View>

            {/* inputs go here */}

            <View
              style={{
                // margin: 10,
              }}>
              <View style={{ flexDirection: 'row' }}>
                {/* <IconSelector
                  selectedIcon={selectedIcon}
                  onPress={() => router.push({ pathname: '/tabs/choose-icon', params: { currentIcon: selectedIcon } })}
                /> */}
                <Pressable
                  style={{
                    borderWidth: 1,
                    borderRadius: '100%',
                    width: 50,
                    height: 50,
                    backgroundColor: COLORS.PrimaryLight,
                    marginRight: 10,
                  }}>

                </Pressable>
                <TextInput
                  style={[uiStyles.inputField, {flex: 1,}]}
                  placeholder="Enter a new goal..."
                  placeholderTextColor="rgba(0,0,0,0.4)"
                  value={habitName}
                  onChangeText={setHabitName}
                  autoFocus
                />
              </View>

              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 7, justifyContent: 'space-between', }}>
                <Pressable
                  style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    padding: 10,
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 3,
                    backgroundColor: '#fff'
                  }}
                >
                  <Image
                    source={SYSTEM_ICONS.clock}
                    style={{ width: 15, height: 15 }}
                  />
                  <Text style={[globalStyles.body, { fontSize: 12, }]}>{time}</Text>
                </Pressable>

                <Pressable
                  style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    padding: 10,
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 3,
                    backgroundColor: '#fff'
                  }}
                >
                  <Image
                    source={SYSTEM_ICONS.calendar}
                    style={{ width: 15, height: 15 }}

                  />
                  <Text style={[globalStyles.body, { fontSize: 12, }]}>Today</Text>
                </Pressable>

                <View>
                  <Pressable
                    style={{
                      borderWidth: 1,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 7,
                      padding: 10,
                      shadowOffset: { width: 2, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: 3,
                      backgroundColor: '#fff'
                    }}
                  >
                    <Image
                      source={SYSTEM_ICONS.repeat}
                      style={{ width: 15, height: 15 }}
                    />
                    <Text style={[globalStyles.body, { fontSize: 12, }]}>{frequency}</Text>
                  </Pressable>
                </View>

                <Pressable
                  style={{
                    borderWidth: 1,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 7,
                    padding: 10,
                    shadowOffset: { width: 2, height: 2 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 3,
                    backgroundColor: '#fff'
                  }}
                >
                  <Image
                    source={SYSTEM_ICONS.reward}
                    style={{ width: 15, height: 15, tintColor: COLORS.Rewards }}

                  />
                  <Text style={[globalStyles.body, { fontSize: 12, }]}>{reward}</Text>
                </Pressable>

                <View>
                  <Pressable
                    style={{
                      borderWidth: 1,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 10,
                      shadowOffset: { width: 2, height: 2 },
                      shadowOpacity: 1,
                      shadowRadius: 0,
                      elevation: 3,
                      backgroundColor: '#fff'
                    }}
                  >
                    <Image
                      source={SYSTEM_ICONS.dots}
                      style={{ width: 15, height: 15 }}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            <Pressable onPress={onSave} style={[buttonStyles.button, { width: '20%', alignSelf: 'flex-end', marginRight: 10, marginTop: 30, }]}>
              <Text style={globalStyles.body}>Save</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(114, 114, 114, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // wrapper = animation only
  cardWrapper: {
    width: '100%',
    maxWidth: 420,
    height: 250

  },

  card: {
    borderRadius: 16,
    padding: 20,
    overflow: 'hidden',
    borderWidth: 1,
    height: 600,
  },

  button: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.Primary,
    borderRadius: 10,
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontFamily: 'p2',
    fontSize: 15,
  },
})