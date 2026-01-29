// // 
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { LinearGradient } from 'expo-linear-gradient';
// import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
// import { useCallback, useState } from 'react';
// import { Image, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

// import { getCalendarOptions } from '@/app/utils/utils';
// import { CalendarPicker } from '@/components/calendarPicker';
// import { Path } from '@/components/types/Path';
// import { FREQUENCIES, STORAGE_KEY, TIMES_OF_DAY, WEEK_DAYS } from '../../components/constants';
// import { ButtonGroup, DaySelector, IconSelector, PathButtonGroup } from '../../components/habits/habitComponents';
// import { Habit } from '../../components/types/Habit';
// import { buttonStyles, habitCardStyles, habitStyles, layoutStyles } from '../styles';
// import { optionContainerStyles } from '../styles/optionContainerStyles';

// export default function NewHabit() {
//     const router = useRouter();
//     const params = useLocalSearchParams();

//     // Helper to get local CALENDAR date string (not UTC, always uses midnight boundary)
//     // This is different from getHabitDate which uses 3:30 AM boundary
//     const getLocalDateString = (date: Date = new Date()) => {
//         const year = date.getFullYear();
//         const month = String(date.getMonth() + 1).padStart(2, '0');
//         const day = String(date.getDate()).padStart(2, '0');
//         return `${year}-${month}-${day}`;
//     };

//     const [habitName, setHabitName] = useState('');
//     const [selectedIcon, setSelectedIcon] = useState('goal');
//     const [selectedTimeOfDay, setSelectedTimeOfDay] = useState<string>('Anytime');
//     const [selectedFrequency, setSelectedFrequency] = useState<string>('No Repeat');
//     const [selectedDays, setSelectedDays] = useState<string[]>([]);
//     const [selectedDate, setSelectedDate] = useState<string>(getCalendarOptions()[0].label);
//     const [startDate, setStartDate] = useState<string>(getLocalDateString());
//     const [rewardPoints, setRewardPoints] = useState<number>(0);
//     const [path, setPath] = useState<string>('None');
//     const [pathColor, setPathColor] = useState<string | undefined>(undefined);

//     const [timeOpen, setTimeOpen] = useState(false);
//     const [dateOpen, setDateOpen] = useState(false);
//     const [frequencyOpen, setFrequencyOpen] = useState(false);
//     const [pathOpen, setPathOpen] = useState(false);
//     const [rewardsOpen, setRewardsOpen] = useState(false);
//     const [showCalendar, setShowCalendar] = useState(false);
//     const [customDate, setCustomDate] = useState<Date | null>(new Date());
//     const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
//     const [paths, setPaths] = useState<Path[]>([]);

//     const REWARD_OPTIONS = [0, 1, 2, 3, 5, 10, 15, 20, 25, 50];

//     // Load paths
//     useFocusEffect(
//         useCallback(() => {
//             const loadPaths = async () => {
//                 try {
//                     const stored = await AsyncStorage.getItem('@paths_storage');
//                     if (stored) {
//                         setPaths(JSON.parse(stored));
//                     }
//                 } catch (e) {
//                     console.error('Error loading paths:', e);
//                 }
//             };
//             loadPaths();
//         }, [])
//     );

//     useFocusEffect(
//         useCallback(() => {
//             const loadSelectedIcon = async () => {
//                 try {
//                     const savedIcon = await AsyncStorage.getItem('@selected_icon_temp');
//                     if (savedIcon) {
//                         setSelectedIcon(savedIcon);
//                         await AsyncStorage.removeItem('@selected_icon_temp');
//                     }
//                 } catch (error) {
//                     console.error('Error loading icon:', error);
//                 }
//             };
//             loadSelectedIcon();
//         }, [])
//     );

//     const toggleDay = (day: string) => {
//         setSelectedDays(prev =>
//             prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
//         );
//     };

//     const dateButtonSelection = selectedDate === 'Today' || selectedDate === 'Tomorrow' ? selectedDate : 'Custom';

//     const handleCustomDateSelect = (date: Date) => {
//         setCustomDate(date);
//         setStartDate(getLocalDateString(date));
//         setSelectedDate(
//             date.toLocaleDateString('en-US', {
//                 weekday: 'short',
//                 month: 'short',
//                 day: 'numeric',
//             })
//         );
//         setShowCalendar(false);
//         setDateOpen(false);
//     };

//     const handleFrequencyChange = (freq: string) => {
//         setSelectedFrequency(freq);
//         if (freq === 'Weekly') {
//             const dayIndex = new Date(startDate).getDay();
//             setSelectedDays([WEEK_DAYS[dayIndex]]);
//         } else if (freq === 'Monthly') {
//             setSelectedDays([]);
//         } else {
//             setSelectedDays([]);
//         }
//     };

//     const createHabit = async () => {
//         if (!habitName.trim()) return;

//         const newHabit: Habit = {
//             id: Date.now().toString(),
//             name: habitName,
//             icon: selectedIcon,
//             frequency: selectedFrequency,
//             // completed: false,
//             selectedTimeOfDay,
//             selectedDays,
//             selectedDate,
//             startDate,
//             rewardPoints,
//             path,
//             pathColor,
//             streak: 0,
//             completionHistory: [],
//             lastCompletedDate: undefined,
//         };

//         try {
//             const oldHabits = await AsyncStorage.getItem(STORAGE_KEY);
//             const habitsArray: Habit[] = oldHabits ? JSON.parse(oldHabits) : [];
//             habitsArray.push(newHabit);
//             await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habitsArray));
//             router.back();
//         } catch (e) {
//             console.error('Failed to save habit', e);
//         }
//     };

//     return (
//         <>
//             <LinearGradient
//                 colors={['#abdc92', '#bfde9d', '#cfe1ab', '#dde4ba', '#e7e8cb', '#eaebd1', '#ededd8', '#f0f0de', '#eef2da', '#ebf4d7', '#e7f6d5', '#e1f8d4']}
//                 start={{ x: 0, y: 0 }}
//                 end={{ x: 1, y: 1 }}
//                 style={layoutStyles.container}
//             >
//                 <ScrollView style={layoutStyles.content}>
//                     <View style={layoutStyles.header}>
//                         <Text style={layoutStyles.pageTitle}>New Habit</Text>
//                     </View>

//                     {/* Reward Points */}
//                     <TouchableOpacity
//                         onPress={() => setRewardsOpen(!rewardsOpen)}
//                         activeOpacity={0.7}
//                     >
//                         <LinearGradient
//                             colors={['#ffd589', '#fdd68a', '#fcd88b', '#fad98d', '#f9da8e', '#f6db90', '#f8daa2', '#fae0b0', '#fde7bd', '#ffedcb']}
//                             start={{ x: 0, y: 0 }}
//                             end={{ x: 1, y: 1 }}
//                             style={habitCardStyles.mainContent}
//                         >
//                             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
//                                 <Image
//                                     source={require('../../components/assets/icons/system/sparkle.png')}
//                                     style={{ width: 12, height: 12 }}
//                                 />
//                                 <Text style={{ fontFamily: 'label', color: 'black', fontSize: 10 }}>
//                                     {rewardPoints} pts
//                                 </Text>
//                             </View>
//                         </LinearGradient>
//                     </TouchableOpacity>

//                     {/* Reward Points Picker */}
//                     {rewardsOpen && (
//                         <View style={{
//                             alignSelf: 'center',
//                             flexDirection: 'row',
//                             flexWrap: 'wrap',
//                             justifyContent: 'center',
//                             gap: 8,
//                             marginBottom: 15,
//                             marginTop: 10,
//                             borderWidth: 1,
//                             borderRadius: 12,
//                             padding: 8,
//                             backgroundColor: '#FFF3DC',
//                             borderColor: '#FFD589',
//                             width: '90%',
//                         }}>
//                             {REWARD_OPTIONS.map((points) => (
//                                 <Pressable
//                                     key={points}
//                                     onPress={() => {
//                                         setRewardPoints(points);
//                                         setRewardsOpen(false);
//                                     }}
//                                     style={{
//                                         borderWidth: rewardPoints === points ? 2 : 1,
//                                         borderColor: rewardPoints === points ? '#bd592eff' : '#FFD589',
//                                         shadowColor: rewardPoints === points ? '#bd592eff' : '#FFD589',
//                                         borderRadius: 12,
//                                         paddingVertical: 8,
//                                         paddingHorizontal: 12,
//                                         backgroundColor: '#F8FFF8',
//                                         shadowOffset: { width: 3, height: 3 },
//                                         shadowOpacity: 1,
//                                         shadowRadius: 0,
//                                         elevation: 5,
//                                     }}
//                                 >
//                                     <Text style={{
//                                         fontSize: 12,
//                                         fontFamily: 'label',
//                                         color: 'black',
//                                         fontWeight: rewardPoints === points ? 'bold' : 'normal',
//                                     }}>
//                                         {points} pts
//                                     </Text>
//                                 </Pressable>
//                             ))}
//                         </View>
//                     )}

//                     <View style={habitCardStyles.newHabitCard}>
//                         {/* Header row */}
//                         <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginBottom: 10, position: 'relative' }}>
//                             <View style={layoutStyles.row}>
//                                 <IconSelector
//                                     selectedIcon={selectedIcon}
//                                     onPress={() => router.push({ pathname: '/tabs/choose-icon', params: { currentIcon: selectedIcon } })}
//                                 />
//                                 <TextInput
//                                     style={habitCardStyles.input}
//                                     placeholder="Enter a new goal..."
//                                     placeholderTextColor="rgba(0,0,0,0.4)"
//                                     value={habitName}
//                                     onChangeText={setHabitName}
//                                     autoFocus

//                                 />
//                             </View>

//                             <Pressable style={[habitStyles.closeButton, { position: 'absolute', right: 5, top: 5 }]} onPress={() => router.back()}>
//                                 <Image
//                                     source={require('../../components/assets/icons/system/close-icon.png')}
//                                     style={{ width: 15, height: 15 }}
//                                 />
//                             </Pressable>
//                         </View>

//                         {/* Options */}
//                         <View style={habitCardStyles.habitOptions}>
//                             {/* Date Picker */}
//                             {(!timeOpen && !frequencyOpen && !pathOpen) || dateOpen ? (
//                                 <>
//                                     <Pressable
//                                         onPress={() => {
//                                             setDateOpen(prev => !prev);
//                                             setTimeOpen(false);
//                                             setFrequencyOpen(false);
//                                             setPathOpen(false);
//                                             setShowCalendar(false);
//                                         }}
//                                     >
//                                         <Text
//                                             style={[
//                                                 buttonStyles.labelButton,
//                                                 { borderColor: '#F0AB8E', shadowColor: '#F0AB8E' },
//                                             ]}
//                                         >
//                                             {selectedDate}
//                                         </Text>
//                                     </Pressable>

//                                     {dateOpen && (
//                                         <View style={optionContainerStyles.dateOptionsContainer}>
//                                             <ButtonGroup
//                                                 options={['Today', 'Tomorrow', 'Custom']}
//                                                 selected={dateButtonSelection}
//                                                 styleOverrides={{
//                                                     button: { borderColor: '#F0AB8E', shadowColor: '#F0AB8E' },
//                                                     selectedButton: { borderColor: '#bd592eff', shadowColor: '#bd592eff' }
//                                                 }}
//                                                 setSelected={(val: string) => {
//                                                     const today = new Date();
//                                                     const tomorrow = new Date(today);
//                                                     tomorrow.setDate(today.getDate() + 1);

//                                                     if (val === 'Today') {
//                                                         setSelectedDate('Today');
//                                                         setStartDate(getLocalDateString(today));
//                                                         setShowCalendar(false);
//                                                         setDateOpen(false);
//                                                     }
//                                                     else if (val === 'Tomorrow') {
//                                                         setSelectedDate('Tomorrow');
//                                                         setStartDate(getLocalDateString(tomorrow));
//                                                         setShowCalendar(false);
//                                                         setDateOpen(false);
//                                                     }
//                                                     else if (val === 'Custom') {
//                                                         setSelectedDate('Today');
//                                                         setStartDate(getLocalDateString(today));
//                                                         setShowCalendar(true);
//                                                     }
//                                                 }}
//                                             />
//                                         </View>
//                                     )}

//                                     {showCalendar && (
//                                         <CalendarPicker
//                                             onSelectDate={(date: Date) => {
//                                                 setStartDate(getLocalDateString(date));
//                                             }}
//                                             setSelectedDate={setSelectedDate}
//                                             setShowCalendar={setShowCalendar}
//                                             setDateOpen={setDateOpen}
//                                         />
//                                     )}
//                                 </>
//                             ) : null}

//                             {/* Time */}
//                             {(!dateOpen && !frequencyOpen && !pathOpen) || timeOpen ? (
//                                 <>
//                                     <Pressable onPress={() => {
//                                         setTimeOpen(prev => !prev);
//                                         setDateOpen(false);
//                                         setFrequencyOpen(false);
//                                         setPathOpen(false);
//                                     }}>
//                                         <Text style={[buttonStyles.labelButton, { borderColor: '#80BEFF', shadowColor: '#80BEFF' }]}>{selectedTimeOfDay}</Text>
//                                     </Pressable>
//                                     {timeOpen && (
//                                         <View style={optionContainerStyles.timeOptionsContainer}>
//                                             <ButtonGroup
//                                                 options={[...TIMES_OF_DAY]}
//                                                 selected={selectedTimeOfDay}
//                                                 setSelected={setSelectedTimeOfDay}
//                                                 onSelect={() => setTimeOpen(false)}
//                                             />
//                                         </View>
//                                     )}
//                                 </>
//                             ) : null}

//                             {/* Frequency */}
//                             {(!dateOpen && !timeOpen && !pathOpen) || frequencyOpen ? (
//                                 <>
//                                     <Pressable onPress={() => {
//                                         setFrequencyOpen(prev => !prev);
//                                         setDateOpen(false);
//                                         setTimeOpen(false);
//                                         setPathOpen(false);
//                                     }}>
//                                         <Text style={[buttonStyles.labelButton, { borderColor: '#C4DEB6', shadowColor: '#C4DEB6' }]}>{selectedFrequency}</Text>
//                                     </Pressable>
//                                     {frequencyOpen && (
//                                         <>
//                                             <View style={optionContainerStyles.frequencyOptionsContainer}>
//                                                 <ButtonGroup
//                                                     options={[...FREQUENCIES]}
//                                                     selected={selectedFrequency}
//                                                     setSelected={handleFrequencyChange}
//                                                     styleOverrides={{
//                                                         button: { borderColor: '#C4DEB6', shadowColor: '#C4DEB6' },
//                                                         selectedButton: { borderColor: '#3A7D44', shadowColor: '#3A7D44' },
//                                                     }}
//                                                     onSelect={() => setFrequencyOpen(false)}
//                                                 />

//                                                 {selectedFrequency === 'Weekly' && (
//                                                     <DaySelector
//                                                         days={[...WEEK_DAYS]}
//                                                         selectedDays={selectedDays}
//                                                         toggleDay={toggleDay}
//                                                     />
//                                                 )}
//                                             </View>
//                                         </>
//                                     )}
//                                 </>
//                             ) : null}

//                             {/* Path */}
//                             {(!dateOpen && !timeOpen && !frequencyOpen) || pathOpen ? (
//                                 <>
//                                     <Pressable onPress={() => {
//                                         setPathOpen(prev => !prev);
//                                         setDateOpen(false);
//                                         setTimeOpen(false);
//                                         setFrequencyOpen(false);
//                                     }}>
//                                         <Text style={[buttonStyles.labelButton, { borderColor: '#FFD589', shadowColor: '#FFD589' }]}>
//                                             {path && path !== 'None' ? path : 'Add to path'}
//                                         </Text>
//                                     </Pressable>

//                                     {pathOpen && (
//                                         <View style={{ width: '100%' }}>
//                                             <View style={optionContainerStyles.pathOptionsContainer}>
//                                                 {paths.length === 0 ? (
//                                                     <View style={{
//                                                         padding: 15,
//                                                     }}>
//                                                         <Text style={{
//                                                             fontFamily: 'label',
//                                                             fontSize: 12,
//                                                             color: 'rgba(0,0,0,0.7)',
//                                                             textAlign: 'center',
//                                                             marginBottom: 8,
//                                                         }}>
//                                                             No paths created yet
//                                                         </Text>
//                                                         <Text style={{
//                                                             fontFamily: 'label',
//                                                             fontSize: 10,
//                                                             color: 'rgba(0,0,0,0.5)',
//                                                             textAlign: 'center'
//                                                         }}>
//                                                             Visit the Paths page to create one
//                                                         </Text>
//                                                     </View>
//                                                 ) : (


//                                                     <PathButtonGroup
//                                                         paths={paths}
//                                                         selectedPath={path}
//                                                         onSelectPath={(pathName: string, pathColor?: string) => {
//                                                             setPath(pathName);
//                                                             setPathColor(pathColor);
//                                                         }}
//                                                         onClose={() => setPathOpen(false)}
//                                                     />

//                                                 )}
//                                             </View>
//                                         </View>
//                                     )}
//                                 </>
//                             ) : null}
//                         </View>

//                         <Pressable style={habitCardStyles.createButton} onPress={createHabit}>
//                             <Text style={habitCardStyles.createButtonText}>Create Habit</Text>
//                         </Pressable>
//                     </View>
//                 </ScrollView>
//             </LinearGradient>
//         </>
//     );
// }

