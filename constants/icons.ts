// @/constants/icons.ts
export interface HabitIcon {
  name: string;
  file: any; // keep it compatible with require() or imported assets
}

export const HABIT_ICONS: Record<string, any> = {
  // Daily Activities
  goal: require('@/assets/icons/habits/daily-activities/goal.png'),
  target: require('@/assets/icons/habits/daily-activities/target.png'),
  alarmClock: require('@/assets/icons/habits/daily-activities/alarm-clock.png'),
  shower: require('@/assets/icons/habits/daily-activities/shower.png'),
  bathtub: require('@/assets/icons/habits/daily-activities/bathtub.png'),
  soap: require('@/assets/icons/habits/daily-activities/soap.png'),
  'soap-dispenser': require('@/assets/icons/habits/daily-activities/soap-dispenser.png'),
  'electric-toothbrush': require('@/assets/icons/habits/daily-activities/electric-toothbrush.png'),
  sunrise: require('@/assets/icons/habits/daily-activities/sunrise.png'),
  sun: require('@/assets/icons/habits/daily-activities/sun.png'),
  'iced-coffee': require('@/assets/icons/habits/daily-activities/iced-coffee.png'),
  'coffee-to-go': require('@/assets/icons/habits/daily-activities/coffee-to-go.png'),
  books: require('@/assets/icons/habits/daily-activities/books.png'),
  kindle: require('@/assets/icons/habits/daily-activities/kindle.png'),
  study: require('@/assets/icons/habits/daily-activities/study.png'),
  ipad: require('@/assets/icons/habits/daily-activities/ipad.png'),
  cooker: require('@/assets/icons/habits/daily-activities/cooker.png'),
  laptop: require('@/assets/icons/habits/daily-activities/laptop.png'),
  'food-and-wine': require('@/assets/icons/habits/daily-activities/food-and-wine.png'),
  podcast: require('@/assets/icons/habits/daily-activities/podcast.png'),
  'doctors-bag': require('@/assets/icons/habits/daily-activities/doctors-bag.png'),
  'target-logo': require('@/assets/icons/habits/daily-activities/target-logo.png'),

  // Cleaning
  housekeeping: require('@/assets/icons/habits/cleaning/housekeeping.png'),
  'vacuum-cleaner': require('@/assets/icons/habits/cleaning/vacuum-cleaner.png'),
  'washing-machine': require('@/assets/icons/habits/cleaning/washing-machine.png'),
  broom: require('@/assets/icons/habits/cleaning/broom.png'),

  // Work
  monitor: require('@/assets/icons/habits/work/monitor.png'),
  workstation: require('@/assets/icons/habits/work/workstation.png'),
  code: require('@/assets/icons/habits/work/code.png'),
  'code-1': require('@/assets/icons/habits/work/code-1.png'),
  mousepad: require('@/assets/icons/habits/work/mousepad.png'),
  folder: require('@/assets/icons/habits/work/folder.png'),
  accounting: require('@/assets/icons/habits/work/accounting.png'),
  github: require('@/assets/icons/habits/work/github.png'),
  'visual-studio-code': require('@/assets/icons/habits/work/visual-studio-code.png'),
  goodnotes: require('@/assets/icons/habits/work/goodnotes.png'),
  'health-book': require('@/assets/icons/habits/work/health-book.png'),
  bookmark: require('@/assets/icons/habits/work/bookmark.png'),
  'book-and-pencil': require('@/assets/icons/habits/work/book-and-pencil.png'),
  'inspect-code': require('@/assets/icons/habits/work/inspect-code.png'),

  // Food
  'kitchen-room': require('@/assets/icons/habits/food/kitchen-room.png'),
  'kitchen-pot': require('@/assets/icons/habits/food/kitchen-pot.png'),
  cutlery: require('@/assets/icons/habits/food/cutlery.png'),
  ingredients: require('@/assets/icons/habits/food/ingredients.png'),
  'olive-oil': require('@/assets/icons/habits/food/olive-oil.png'),
  sandwich: require('@/assets/icons/habits/food/sandwich.png'),
  'rice-bowl': require('@/assets/icons/habits/food/rice-bowl.png'),
  lemon: require('@/assets/icons/habits/food/lemon.png'),
  flour: require('@/assets/icons/habits/food/flour.png'),
  popcorn: require('@/assets/icons/habits/food/popcorn.png'),
  'boiled-egg': require('@/assets/icons/habits/food/boiled-egg.png'),
  sushi: require('@/assets/icons/habits/food/sushi.png'),
  cheesecake: require('@/assets/icons/habits/food/cheesecake.png'),
  tofu: require('@/assets/icons/habits/food/tofu.png'),
  'sunny-side-up-eggs': require('@/assets/icons/habits/food/sunny-side-up-eggs.png'),
  avocado: require('@/assets/icons/habits/food/avocado.png'),
  banana: require('@/assets/icons/habits/food/banana.png'),

  // Fitness
  running: require('@/assets/icons/habits/fitness/running.png'),
  'girl-running': require('@/assets/icons/habits/fitness/girl-running.png'),
  'yoga-mat': require('@/assets/icons/habits/fitness/yoga-mat.png'),
  kicking: require('@/assets/icons/habits/fitness/kicking.png'),
  dumbbell: require('@/assets/icons/habits/fitness/dumbbell.png'),

  // Financing
  budget: require('@/assets/icons/habits/financing/budget.png'),
  'dollar-bag': require('@/assets/icons/habits/financing/dollar-bag.png'),
  'money-transfer': require('@/assets/icons/habits/financing/money-transfer.png'),
  'money-box': require('@/assets/icons/habits/financing/money-box.png'),

  // Nature
  nature: require('@/assets/icons/habits/nature/nature.png'),
  valley: require('@/assets/icons/habits/nature/valley.png'),
  field: require('@/assets/icons/habits/nature/field.png'),

  // Music
  radio: require('@/assets/icons/habits/music/radio.png'),
  music: require('@/assets/icons/habits/music/music.png'),
  'apple-music': require('@/assets/icons/habits/music/apple-music.png'),
  headphones: require('@/assets/icons/habits/music/headphones.png'),
  earbuds: require('@/assets/icons/habits/music/earbuds.png'),
  piano: require('@/assets/icons/habits/music/piano.png'),
  violin: require('@/assets/icons/habits/music/violin.png'),
  'quarter-rest': require('@/assets/icons/habits/music/quarter-rest.png'),
};

// Now the categories using the HABIT_ICONS mapping
export const ICON_CATEGORIES: Record<string, HabitIcon[]> = {
  'Daily Activities': [
    { name: 'goal', file: HABIT_ICONS.goal },
    { name: 'target', file: HABIT_ICONS.target },
    { name: 'alarmClock', file: HABIT_ICONS.alarmClock },
    { name: 'shower', file: HABIT_ICONS.shower },
    { name: 'bathtub', file: HABIT_ICONS.bathtub },
    { name: 'soap', file: HABIT_ICONS.soap },
    { name: 'soap-dispenser', file: HABIT_ICONS['soap-dispenser'] },
    { name: 'electric-toothbrush', file: HABIT_ICONS['electric-toothbrush'] },
    { name: 'sunrise', file: HABIT_ICONS.sunrise },
    { name: 'sun', file: HABIT_ICONS.sun },
    { name: 'iced-coffee', file: HABIT_ICONS['iced-coffee'] },
    { name: 'coffee-to-go', file: HABIT_ICONS['coffee-to-go'] },
    { name: 'books', file: HABIT_ICONS.books },
    { name: 'kindle', file: HABIT_ICONS.kindle },
    { name: 'study', file: HABIT_ICONS.study },
    { name: 'ipad', file: HABIT_ICONS.ipad },
    { name: 'cooker', file: HABIT_ICONS.cooker },
    { name: 'laptop', file: HABIT_ICONS.laptop },
    { name: 'food-and-wine', file: HABIT_ICONS['food-and-wine'] },
    { name: 'podcast', file: HABIT_ICONS.podcast },
    { name: 'doctors-bag', file: HABIT_ICONS['doctors-bag'] },
    { name: 'target-logo', file: HABIT_ICONS['target-logo'] },
  ],

  Cleaning: [
    { name: 'housekeeping', file: HABIT_ICONS.housekeeping },
    { name: 'vacuum-cleaner', file: HABIT_ICONS['vacuum-cleaner'] },
    { name: 'washing-machine', file: HABIT_ICONS['washing-machine'] },
    { name: 'broom', file: HABIT_ICONS.broom },
  ],

  Work: [
    { name: 'monitor', file: HABIT_ICONS.monitor },
    { name: 'workstation', file: HABIT_ICONS.workstation },
    { name: 'code', file: HABIT_ICONS.code },
    { name: 'code-1', file: HABIT_ICONS['code-1'] },
    { name: 'mousepad', file: HABIT_ICONS.mousepad },
    { name: 'folder', file: HABIT_ICONS.folder },
    { name: 'accounting', file: HABIT_ICONS.accounting },
    { name: 'github', file: HABIT_ICONS.github },
    { name: 'visual-studio-code', file: HABIT_ICONS['visual-studio-code'] },
    { name: 'goodnotes', file: HABIT_ICONS.goodnotes },
    { name: 'health-book', file: HABIT_ICONS['health-book'] },
    { name: 'bookmark', file: HABIT_ICONS.bookmark },
    { name: 'book-and-pencil', file: HABIT_ICONS['book-and-pencil'] },
    { name: 'inspect-code', file: HABIT_ICONS['inspect-code'] },
  ],

  Food: [
    { name: 'kitchen-room', file: HABIT_ICONS['kitchen-room'] },
    { name: 'kitchen-pot', file: HABIT_ICONS['kitchen-pot'] },
    { name: 'cutlery', file: HABIT_ICONS.cutlery },
    { name: 'ingredients', file: HABIT_ICONS.ingredients },
    { name: 'olive-oil', file: HABIT_ICONS['olive-oil'] },
    { name: 'sandwich', file: HABIT_ICONS.sandwich },
    { name: 'rice-bowl', file: HABIT_ICONS['rice-bowl'] },
    { name: 'lemon', file: HABIT_ICONS.lemon },
    { name: 'flour', file: HABIT_ICONS.flour },
    { name: 'popcorn', file: HABIT_ICONS.popcorn },
    { name: 'boiled-egg', file: HABIT_ICONS['boiled-egg'] },
    { name: 'sushi', file: HABIT_ICONS.sushi },
    { name: 'cheesecake', file: HABIT_ICONS.cheesecake },
    { name: 'tofu', file: HABIT_ICONS.tofu },
    { name: 'sunny-side-up-eggs', file: HABIT_ICONS['sunny-side-up-eggs'] },
    { name: 'avocado', file: HABIT_ICONS.avocado },
    { name: 'banana', file: HABIT_ICONS.banana },
  ],

  Fitness: [
    { name: 'running', file: HABIT_ICONS.running },
    { name: 'girl-running', file: HABIT_ICONS['girl-running'] },
    { name: 'yoga-mat', file: HABIT_ICONS['yoga-mat'] },
    { name: 'kicking', file: HABIT_ICONS.kicking },
    { name: 'dumbbell', file: HABIT_ICONS.dumbbell },
  ],

  Financing: [
    { name: 'budget', file: HABIT_ICONS.budget },
    { name: 'dollar-bag', file: HABIT_ICONS['dollar-bag'] },
    { name: 'money-transfer', file: HABIT_ICONS['money-transfer'] },
    { name: 'money-box', file: HABIT_ICONS['money-box'] },
  ],

  Nature: [
    { name: 'nature', file: HABIT_ICONS.nature },
    { name: 'valley', file: HABIT_ICONS.valley },
    { name: 'field', file: HABIT_ICONS.field },
  ],

  Music: [
    { name: 'radio', file: HABIT_ICONS.radio },
    { name: 'music', file: HABIT_ICONS.music },
    { name: 'apple-music', file: HABIT_ICONS['apple-music'] },
    { name: 'headphones', file: HABIT_ICONS.headphones },
    { name: 'earbuds', file: HABIT_ICONS.earbuds },
    { name: 'piano', file: HABIT_ICONS.piano },
    { name: 'violin', file: HABIT_ICONS.violin },
    { name: 'quarter-rest', file: HABIT_ICONS['quarter-rest'] },
  ],
};

export function getHabitIcon(name: string) {
  for (const category of Object.values(ICON_CATEGORIES)) {
    const found = category.find(icon => icon.name === name);
    if (found) return found.file;
  }
  return null; // icon not found
}

export const ICON_CATEGORIES2: Record<string, HabitIcon[]> = {
    'Daily Activities': [
        { name: 'goal', file: require('@/assets/icons/habits/daily-activities/goal.png') },
        { name: 'target', file: require('@/assets/icons/habits/daily-activities/target.png') },
        { name: 'alarm-clock', file: require('@/assets/icons/habits/daily-activities/alarm-clock.png') },
        { name: 'shower', file: require('@/assets/icons/habits/daily-activities/shower.png') },
        { name: 'bathtub', file: require('@/assets/icons/habits/daily-activities/bathtub.png') },
        { name: 'soap', file: require('@/assets/icons/habits/daily-activities/soap.png') },
        { name: 'soap-dispenser', file: require('@/assets/icons/habits/daily-activities/soap-dispenser.png') },
        { name: 'electric-toothbrush', file: require('@/assets/icons/habits/daily-activities/electric-toothbrush.png') },
        { name: 'sunrise', file: require('@/assets/icons/habits/daily-activities/sunrise.png') },
        { name: 'sun', file: require('@/assets/icons/habits/daily-activities/sun.png') },
        { name: 'iced-coffee', file: require('@/assets/icons/habits/daily-activities/iced-coffee.png') },
        { name: 'coffee-to-go', file: require('@/assets/icons/habits/daily-activities/coffee-to-go.png') },
        { name: 'books', file: require('@/assets/icons/habits/daily-activities/books.png') },
        { name: 'kindle', file: require('@/assets/icons/habits/daily-activities/kindle.png') },
        { name: 'study', file: require('@/assets/icons/habits/daily-activities/study.png') },
        { name: 'ipad', file: require('@/assets/icons/habits/daily-activities/ipad.png') },
        { name: 'cooker', file: require('@/assets/icons/habits/daily-activities/cooker.png') },
        { name: 'laptop', file: require('@/assets/icons/habits/daily-activities/laptop.png') },
        { name: 'food-and-wine', file: require('@/assets/icons/habits/daily-activities/food-and-wine.png') },
        { name: 'podcast', file: require('@/assets/icons/habits/daily-activities/podcast.png') },
        { name: 'doctors-bag', file: require('@/assets/icons/habits/daily-activities/doctors-bag.png') },
        { name: 'target-logo', file: require('@/assets/icons/habits/daily-activities/target-logo.png') },
    ],

    'Cleaning': [
        { name: 'housekeeping', file: require('@/assets/icons/habits/cleaning/housekeeping.png') },
        { name: 'vacuum-cleaner', file: require('@/assets/icons/habits/cleaning/vacuum-cleaner.png') },
        { name: 'washing-machine', file: require('@/assets/icons/habits/cleaning/washing-machine.png') },
        { name: 'broom', file: require('@/assets/icons/habits/cleaning/broom.png') },
    ],

    'Work': [
        { name: 'monitor', file: require('@/assets/icons/habits/work/monitor.png') },
        { name: 'workstation', file: require('@/assets/icons/habits/work/workstation.png') },
        { name: 'code', file: require('@/assets/icons/habits/work/code.png') },
        { name: 'code-1', file: require('@/assets/icons/habits/work/code-1.png') },
        { name: 'mousepad', file: require('@/assets/icons/habits/work/mousepad.png') },
        { name: 'folder', file: require('@/assets/icons/habits/work/folder.png') },
        { name: 'accounting', file: require('@/assets/icons/habits/work/accounting.png') },
        { name: 'github', file: require('@/assets/icons/habits/work/github.png') },
        { name: 'visual-studio-code', file: require('@/assets/icons/habits/work/visual-studio-code.png') },
        { name: 'goodnotes', file: require('@/assets/icons/habits/work/goodnotes.png') },
        { name: 'health-book', file: require('@/assets/icons/habits/work/health-book.png') },
        { name: 'bookmark', file: require('@/assets/icons/habits/work/bookmark.png') },
        { name: 'book-and-pencil', file: require('@/assets/icons/habits/work/book-and-pencil.png') },
        { name: 'inspect-code', file: require('@/assets/icons/habits/work/inspect-code.png') },
    ],

    'Food': [
        { name: 'kitchen-room', file: require('@/assets/icons/habits/food/kitchen-room.png') },
        { name: 'kitchen-pot', file: require('@/assets/icons/habits/food/kitchen-pot.png') },
        // { name: 'coffee-maker', file: require('@/assets/icons/habits/food/coffee-maker.png') },
        { name: 'cutlery', file: require('@/assets/icons/habits/food/cutlery.png') },
        { name: 'ingredients', file: require('@/assets/icons/habits/food/ingredients.png') },
        { name: 'olive-oil', file: require('@/assets/icons/habits/food/olive-oil.png') },
        { name: 'sandwich', file: require('@/assets/icons/habits/food/sandwich.png') },
        { name: 'rice-bowl', file: require('@/assets/icons/habits/food/rice-bowl.png') },
        { name: 'lemon', file: require('@/assets/icons/habits/food/lemon.png') },
        { name: 'flour', file: require('@/assets/icons/habits/food/flour.png') },
        { name: 'popcorn', file: require('@/assets/icons/habits/food/popcorn.png') },
        { name: 'boiled-egg', file: require('@/assets/icons/habits/food/boiled-egg.png') },
        { name: 'sushi', file: require('@/assets/icons/habits/food/sushi.png') },
        { name: 'cheesecake', file: require('@/assets/icons/habits/food/cheesecake.png') },
        { name: 'tofu', file: require('@/assets/icons/habits/food/tofu.png') },
        { name: 'sunny-side-up-eggs', file: require('@/assets/icons/habits/food/sunny-side-up-eggs.png') },
        { name: 'avocado', file: require('@/assets/icons/habits/food/avocado.png') },
        { name: 'banana', file: require('@/assets/icons/habits/food/banana.png') },
    ],

    'Fitnesss': [
        { name: 'running', file: require('@/assets/icons/habits/fitness/running.png') },
        { name: 'girl-running', file: require('@/assets/icons/habits/fitness/girl-running.png') },
        { name: 'yoga-mat', file: require('@/assets/icons/habits/fitness/yoga-mat.png') },
        { name: 'kicking', file: require('@/assets/icons/habits/fitness/kicking.png') },
        { name: 'dumbbell', file: require('@/assets/icons/habits/fitness/dumbbell.png') },
    ],

    'Financing': [
        { name: 'budget', file: require('@/assets/icons/habits/financing/budget.png') },
        { name: 'dollar-bag', file: require('@/assets/icons/habits/financing/dollar-bag.png') },
        { name: 'money-transfer', file: require('@/assets/icons/habits/financing/money-transfer.png') },
        { name: 'money-box', file: require('@/assets/icons/habits/financing/money-box.png') },
    ],

    'Nature': [
        { name: 'nature', file: require('@/assets/icons/habits/nature/nature.png') },
        { name: 'valley', file: require('@/assets/icons/habits/nature/valley.png') },
        { name: 'field', file: require('@/assets/icons/habits/nature/field.png') },
    ],

    'Music': [
        { name: 'radio', file: require('@/assets/icons/habits/music/radio.png') },
        { name: 'music', file: require('@/assets/icons/habits/music/music.png') },
        { name: 'apple-music', file: require('@/assets/icons/habits/music/apple-music.png') },
        { name: 'headphones', file: require('@/assets/icons/habits/music/headphones.png') },
        { name: 'earbuds', file: require('@/assets/icons/habits/music/earbuds.png') },
        { name: 'piano', file: require('@/assets/icons/habits/music/piano.png') },
        { name: 'violin', file: require('@/assets/icons/habits/music/violin.png') },
        { name: 'quarter-rest', file: require('@/assets/icons/habits/music/quarter-rest.png') },
    ]
}

export const SYSTEM_ICONS = {
    // nav bar icons
    habit: require('@/assets/icons/system/habit-icon.png'),
    snooze: require('@/assets/icons/system/snooze.png'),
    skip: require('@/assets/icons/system/skip.png'),

    assignment: require('@/assets/icons/system/assignment.png'),
    journal: require('@/assets/icons/system/journal-icon.png'),

    path: require('@/assets/icons/system/path-icon.png'),
    path2: require('@/assets/icons/system/path-icon2.png'),
    quest: require('@/assets/icons/system/quest-icon.png'),
    profile: require('@/assets/icons/system/profile-icon.png'),
    more: require('@/assets/icons/system/more-icon.png'),
    back: require('@/assets/icons/system/back.png'),

    fire: require('@/assets/icons/system/fire.png'),
    star: require('@/assets/icons/system/star-icon.png'),
    show: require('@/assets/icons/system/show.png'),
    hide: require('@/assets/icons/system/hide.png'),
    list: require('@/assets/icons/system/list.png'),
    reward: require('@/assets/icons/system/sparkle-fill.png'),
    stopwatch: require('@/assets/icons/system/stopwatch.png'),
    tag: require('@/assets/icons/system/tag.png'),
    settings: require('@/assets/icons/system/settings-icon.png'),
    delete: require('@/assets/icons/system/delete.png'),
    lock: require('@/assets/icons/system/lock.png'),
    padlock: require('@/assets/icons/system/padlock.png'),

    sort: require('@/assets/icons/system/sort.png'),
    sortLeft: require('@/assets/icons/system/sort-left.png'),
    sortRight: require('@/assets/icons/system/sort-right.png'),
    clock: require('@/assets/icons/system/clock.png'),
    repeat: require('@/assets/icons/system/repeat.png'),
    calendar: require('@/assets/icons/system/calendar.png'),
    dots: require('@/assets/icons/system/dots.png'),
    location: require('@/assets/icons/system/location-icon.png'),
    write: require('@/assets/icons/system/write.png'),
    headphones: require('@/assets/icons/system/headphones.png'),
    musicNote: require('@/assets/icons/system/music-note.png'),
    search: require('@/assets/icons/system/search.png'),
};

