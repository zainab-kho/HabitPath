export type HabitIcon = {
    name: string;
    file: any;
};

export const ICON_CATEGORIES: Record<string, HabitIcon[]> = {
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
    assignment: require('@/assets/icons/system/assignment.png'),
    journal: require('@/assets/icons/system/journal-icon.png'),

    path: require('@/assets/icons/system/path-icon.png'),
    path2: require('@/assets/icons/system/path-icon2.png'),
    quest: require('@/assets/icons/system/quest-icon.png'),
    profile: require('@/assets/icons/system/profile-icon.png'),
    more: require('@/assets/icons/system/more-icon.png'),
    back: require('@/assets/icons/system/back.png'),

    fire: require('@/assets/icons/system/fire.png'),
    show: require('@/assets/icons/system/show.png'),
    hide: require('@/assets/icons/system/hide.png'),
    list: require('@/assets/icons/system/list.png'),
    reward: require('@/assets/icons/system/sparkle-fill.png'),
    stopwatch: require('@/assets/icons/system/stopwatch.png'),
    tag: require('@/assets/icons/system/tag.png'),
    settings: require('@/assets/icons/system/settings-icon.png'),
    delete: require('@/assets/icons/system/delete.png'),

    sort: require('@/assets/icons/system/sort.png'),
    sortLeft: require('@/assets/icons/system/sort-left.png'),
    sortRight: require('@/assets/icons/system/sort-right.png'),
    clock: require('@/assets/icons/system/clock.png'),
    repeat: require('@/assets/icons/system/repeat.png'),
    calendar: require('@/assets/icons/system/calendar.png'),
    dots: require('@/assets/icons/system/dots.png'),
    location: require('@/assets/icons/system/location-icon.png'),
};

