// // @/modals/NewHabitModal.tsx
// import { COLORS, PAGE } from '@/constants/colors';
// import { FREQUENCIES, REWARD_OPTIONS, TIMES_OF_DAY, WEEK_DAYS } from '@/constants/habits';
// import { SYSTEM_ICONS } from '@/constants/icons';
// import { useAuth } from '@/contexts/AuthContext';
// import { globalStyles, uiStyles } from '@/styles';
// import { saveNewHabit } from '@/utils/habitsActions';
// import { getLocalDateString } from '@/utils/habitUtils';
// import { LinearGradient } from 'expo-linear-gradient';
// import React, { useState } from 'react';
// import {
//   Image,
//   Modal,
//   Pressable,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TextInput,
//   View,
// } from 'react-native';

// interface NewHabitModalProps {
//   visible: boolean;
//   onClose: () => void;
//   onSave: () => void;
// }

// export default function NewHabitModal({
//   visible,
//   onClose,
//   onSave,
// }: NewHabitModalProps) {
//   const { user } = useAuth();

//   // form state
//   const [habitName, setHabitName] = useState('');
//   const [selectedTimeOfDay, setSelectedTimeOfDay] = useState('Anytime');
//   const [selectedFrequency, setSelectedFrequency] = useState('Daily');
//   const [selectedDays, setSelectedDays] = useState<string[]>([]);
//   const [startDate, setStartDate] = useState(getLocalDateString());
//   const [rewardPoints, setRewardPoints] = useState(1);

//   // ui state
//   const [timeOpen, setTimeOpen] = useState(false);
//   const [frequencyOpen, setFrequencyOpen] = useState(false);
//   const [rewardsOpen, setRewardsOpen] = useState(false);
//   const [isSaving, setIsSaving] = useState(false);

//   const toggleDay = (day: string) => {
//     setSelectedDays(prev =>
//       prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
//     );
//   };

//   const handleSave = async () => {
//     if (!habitName.trim() || !user) return;

//     setIsSaving(true);

//     try {
//       await saveNewHabit(
//         {
//           name: habitName.trim(),
//           icon: '',
//           frequency: selectedFrequency,
//           selectedDays,
//           selectedTimeOfDay,
//           startDate,
//           selectedDate: 'Today',
//           rewardPoints,
//           path: undefined,
//           pathColor: undefined,
//           lastCompletedDate: undefined,
//           tempTimeOfDay: undefined,
//           tempTimeOfDayDate: undefined,
//           snoozedUntil: undefined,
//           skippedDates: [],
//           keepUntil: false,
//           increment: false,
//           incrementAmount: 0,
//           incrementType: 'None',
//         },
//         user.id
//       );

//       // reset form
//       setHabitName('');
//       setSelectedTimeOfDay('Anytime');
//       setSelectedFrequency('Daily');
//       setSelectedDays([]);
//       setRewardPoints(1);
      
//       onSave();
//     } catch (error) {
//       console.error('error creating habit:', error);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   return (
//     <Modal
//       transparent
//       visible={visible}
//       animationType="slide"
//       onRequestClose={onClose}
//     >
//       <Pressable style={styles.overlay} onPress={onClose}>
//         <Pressable
//           style={styles.cardWrapper}
//           onPress={(e) => e.stopPropagation()}
//         >
//           <LinearGradient
//             colors={PAGE.settings.background}
//             start={{ x: 0, y: 0 }}
//             end={{ x: 1, y: 1 }}
//             style={styles.card}
//           >
//             {/* header */}
//             <View style={styles.header}>
//               <Text style={globalStyles.h3}>new habit</Text>
//             </View>

//             <ScrollView showsVerticalScrollIndicator={false}>
//               {/* habit name */}
//               <View style={styles.section}>
//                 <TextInput
//                   style={[uiStyles.inputField, styles.input]}
//                   placeholder="enter a new goal..."
//                   placeholderTextColor="rgba(0,0,0,0.4)"
//                   value={habitName}
//                   onChangeText={setHabitName}
//                   autoFocus
//                 />
//               </View>

//               {/* options */}
//               <View style={styles.optionsRow}>
//                 {/* time of day */}
//                 <Pressable
//                   style={styles.optionButton}
//                   onPress={() => setTimeOpen(!timeOpen)}
//                 >
//                   <Image source={SYSTEM_ICONS.clock} style={styles.optionIcon} />
//                   <Text style={styles.optionText}>{selectedTimeOfDay}</Text>
//                 </Pressable>

//                 {/* frequency */}
//                 <Pressable
//                   style={styles.optionButton}
//                   onPress={() => setFrequencyOpen(!frequencyOpen)}
//                 >
//                   <Image source={SYSTEM_ICONS.repeat} style={styles.optionIcon} />
//                   <Text style={styles.optionText}>{selectedFrequency}</Text>
//                 </Pressable>

//                 {/* rewards */}
//                 <Pressable
//                   style={styles.optionButton}
//                   onPress={() => setRewardsOpen(!rewardsOpen)}
//                 >
//                   <Image
//                     source={SYSTEM_ICONS.reward}
//                     style={[styles.optionIcon, { tintColor: COLORS.Rewards }]}
//                   />
//                   <Text style={styles.optionText}>{rewardPoints}</Text>
//                 </Pressable>
//               </View>

//               {/* time picker */}
//               {timeOpen && (
//                 <View style={styles.picker}>
//                   {TIMES_OF_DAY.map((time) => (
//                     <Pressable
//                       key={time}
//                       style={[
//                         styles.pickerOption,
//                         selectedTimeOfDay === time && styles.pickerOptionSelected,
//                       ]}
//                       onPress={() => {
//                         setSelectedTimeOfDay(time);
//                         setTimeOpen(false);
//                       }}
//                     >
//                       <Text style={globalStyles.body}>{time}</Text>
//                     </Pressable>
//                   ))}
//                 </View>
//               )}

//               {/* frequency picker */}
//               {frequencyOpen && (
//                 <View style={styles.picker}>
//                   {FREQUENCIES.map((freq) => (
//                     <Pressable
//                       key={freq}
//                       style={[
//                         styles.pickerOption,
//                         selectedFrequency === freq && styles.pickerOptionSelected,
//                       ]}
//                       onPress={() => {
//                         setSelectedFrequency(freq);
//                         if (freq === 'Weekly') {
//                           const dayIndex = new Date().getDay();
//                           setSelectedDays([WEEK_DAYS[dayIndex]]);
//                         } else {
//                           setSelectedDays([]);
//                         }
//                         setFrequencyOpen(false);
//                       }}
//                     >
//                       <Text style={globalStyles.body}>{freq}</Text>
//                     </Pressable>
//                   ))}

//                   {/* day selector for weekly */}
//                   {selectedFrequency === 'Weekly' && (
//                     <View style={styles.daySelector}>
//                       {WEEK_DAYS.map((day) => (
//                         <Pressable
//                           key={day}
//                           style={[
//                             styles.dayButton,
//                             selectedDays.includes(day) && styles.dayButtonSelected,
//                           ]}
//                           onPress={() => toggleDay(day)}
//                         >
//                           <Text style={styles.dayText}>{day.slice(0, 3)}</Text>
//                         </Pressable>
//                       ))}
//                     </View>
//                   )}
//                 </View>
//               )}

//               {/* rewards picker */}
//               {rewardsOpen && (
//                 <View style={styles.picker}>
//                   {REWARD_OPTIONS.map((points) => (
//                     <Pressable
//                       key={points}
//                       style={[
//                         styles.pickerOption,
//                         rewardPoints === points && styles.pickerOptionSelected,
//                       ]}
//                       onPress={() => {
//                         setRewardPoints(points);
//                         setRewardsOpen(false);
//                       }}
//                     >
//                       <Text style={globalStyles.body}>{points} pts</Text>
//                     </Pressable>
//                   ))}
//                 </View>
//               )}
//             </ScrollView>

//             {/* actions */}
//             <View style={styles.actions}>
//               <Pressable
//                 style={[styles.button, styles.cancelButton]}
//                 onPress={onClose}
//               >
//                 <Text style={globalStyles.body}>cancel</Text>
//               </Pressable>

//               <Pressable
//                 style={[styles.button, styles.saveButton]}
//                 onPress={handleSave}
//                 disabled={isSaving || !habitName.trim()}
//               >
//                 <Text style={globalStyles.body}>
//                   {isSaving ? 'saving...' : 'save'}
//                 </Text>
//               </Pressable>
//             </View>
//           </LinearGradient>
//         </Pressable>
//       </Pressable>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(114, 114, 114, 0.4)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },

//   cardWrapper: {
//     width: '90%',
//     maxWidth: 420,
//     maxHeight: '80%',
//   },

//   card: {
//     borderRadius: 16,
//     padding: 20,
//     borderWidth: 1,
//   },

//   header: {
//     alignItems: 'center',
//     marginBottom: 20,
//   },

//   section: {
//     marginBottom: 15,
//   },

//   input: {
//     marginBottom: 0,
//   },

//   optionsRow: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     marginBottom: 15,
//   },

//   optionButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//     padding: 10,
//     borderWidth: 1,
//     borderRadius: 12,
//     backgroundColor: '#fff',
//     shadowOffset: { width: 2, height: 2 },
//     shadowOpacity: 1,
//     shadowRadius: 0,
//   },

//   optionIcon: {
//     width: 15,
//     height: 15,
//   },

//   optionText: {
//     fontSize: 12,
//     fontFamily: 'body',
//   },

//   picker: {
//     gap: 8,
//     marginBottom: 15,
//   },

//   pickerOption: {
//     padding: 12,
//     borderWidth: 1,
//     borderRadius: 12,
//     backgroundColor: '#fff',
//   },

//   pickerOptionSelected: {
//     backgroundColor: COLORS.PrimaryLight,
//   },

//   daySelector: {
//     flexDirection: 'row',
//     flexWrap: 'wrap',
//     gap: 8,
//     marginTop: 10,
//   },

//   dayButton: {
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderWidth: 1,
//     borderRadius: 8,
//     backgroundColor: '#fff',
//   },

//   dayButtonSelected: {
//     backgroundColor: COLORS.Primary,
//   },

//   dayText: {
//     fontSize: 12,
//     fontFamily: 'body',
//   },

//   actions: {
//     flexDirection: 'row',
//     gap: 10,
//     marginTop: 20,
//   },

//   button: {
//     flex: 1,
//     padding: 12,
//     borderRadius: 12,
//     borderWidth: 1,
//     alignItems: 'center',
//   },

//   cancelButton: {
//     backgroundColor: '#f0f0f0',
//   },

//   saveButton: {
//     backgroundColor: COLORS.Primary,
//   },
// });