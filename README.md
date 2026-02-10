# Habit Tracker & Productivity Suite

A comprehensive React Native mobile application for habit tracking, assignment management, journaling, and goal setting with intelligent scheduling and progress visualization.

![React Native](https://img.shields.io/badge/React%20Native-0.76-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)
![Expo](https://img.shields.io/badge/Expo-52-black)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)

## 🎯 Overview

A full-stack mobile productivity app that helps users build better habits, manage coursework, track mood, and achieve long-term goals through an intuitive, visually engaging interface.

<p align="center">
  <img src="https://github.com/user-attachments/assets/c967af7a-262d-4049-a7ad-ee3fa2707350" width="300" />
  <img src="https://github.com/user-attachments/assets/82dbe02b-c61d-40cf-bf36-70800cbb5007" width="300" />
  <img src="https://github.com/user-attachments/assets/3c77dac7-da57-4d72-ab19-1237d7ad654d" width="300" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/fe505ee0-0faf-4729-8df1-f0fb9a95a352" width="300" />
  <img src="https://github.com/user-attachments/assets/f77bb4b1-0bcb-4664-bfd2-7f0d406f2059" width="300" />
</p>


## ✨ Key Features

### 📊 Smart Habit Tracking
- **Flexible Scheduling**: Daily, weekly, monthly, and custom frequency options
- **Time-of-Day Organization**: Habits grouped by Wake Up, Morning, Afternoon, Evening, and Bed Time
- **Intelligent Date Handling**: Custom day-reset time (e.g., day ends at 4 AM for night owls)
- **Streak Tracking**: Visual streak indicators and best streak records
- **Reward System**: Customizable point values for gamification
- **Progress Visualization**: Real-time completion percentage and daily progress bars

### 📚 Assignment & Course Management
- **Course Organization**: Color-coded courses with schedules and instructor details
- **Smart Due Date System**: Assignments categorized by "Due", "This Week", and "Upcoming"
- **Week Planning**: Create weekly schedules with drag-and-drop assignment placement
- **Today's Focus**: Daily assignment view with completion checkboxes
- **Progress Tracking**: Status labels (Not Started, In Progress, Will Do Later, Done)
- **Calendar Integration**: Visual calendar for due date selection

### 📝 Mood Journaling
- **Rich Entry Creation**: Date, time, location, mood, and free-form text entries
- **Mood Tracking**: 12 distinct moods with color-coded visualization
- **Year in Pixels**: Visual mood calendar showing the last 3 months at a glance
- **Entry Management**: Edit, delete, and browse entries by month

### 🎮 Gamification & Motivation
- **Point System**: Earn points for completing habits
- **Streak Badges**: Fire emoji badges for 3+ day streaks
- **App-Wide Streak**: Track consecutive days of any habit completion
- **Visual Feedback**: Color-coded completion states and animations

## 🏗️ Technical Architecture

### Frontend
- **Framework**: React Native with Expo 52
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **State Management**: React Hooks with custom hooks pattern
- **UI Components**: Custom shadow-box design system with gradient backgrounds
- **Gestures**: React Native Gesture Handler for swipe navigation
- **Storage**: AsyncStorage for offline caching

### Backend & Database
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email/password
- **Real-time Sync**: Background syncing with optimistic UI updates
- **Caching Strategy**: Smart 7-day cache window (±3 days from today)

### Key Technical Features
- **Offline-First Architecture**: AsyncStorage caching with background Supabase sync
- **Optimistic Updates**: Instant UI feedback with rollback on error
- **Smart Data Loading**: Cache-first strategy with stale-while-revalidate pattern
- **Timezone Handling**: Custom date utilities to prevent timezone bugs
- **Performance Optimization**: Memoization, FlatList virtualization, and efficient re-renders

## 📁 Project Structure

```
├── app/                          # Expo Router screens
│   ├── (tabs)/                  # Tab-based navigation
│   │   ├── habits/              # Habit tracking screens
│   │   ├── assignments/         # Assignment management
│   │   ├── quests/              # Quest system (in progress)
│   │   └── profile/             # User profile
│   ├── auth/                    # Authentication screens
│   └── _layout.tsx              # Root layout with auth routing
├── components/                   # Reusable components
│   ├── habits/                  # Habit-specific components
│   ├── assignments/             # Assignment components
│   └── journal/                 # Journal components
├── hooks/                       # Custom React hooks
│   ├── useHabits.ts            # Main habits data hook
│   ├── useAssignmentData.ts    # Assignment data management
│   └── useAssignmentActions.ts # Assignment CRUD operations
├── modals/                      # Modal components
├── navigation/                  # Navigation components
│   ├── DrawerContext.tsx       # Drawer state management
│   └── BottomNav.tsx           # Bottom tab navigation
├── styles/                      # Global styles
├── types/                       # TypeScript type definitions
├── ui/                         # Reusable UI components
├── utils/                      # Utility functions
│   ├── dateUtils.ts           # Centralized date handling
│   ├── habitsActions.ts       # Habit CRUD operations
│   └── gradients.ts           # Time-based gradient colors
└── constants/                  # App constants and config
```

## 🔧 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Studio (for emulator)
- Supabase account

### Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/habit-tracker.git
cd habit-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up Supabase:
- Create a new Supabase project
- Run the provided SQL schema (see `database/schema.sql`)
- Enable Row Level Security (RLS) policies

5. Start the development server:
```bash
npx expo start
```

## 🗄️ Database Schema

### Core Tables
- `habits` - User habits with frequency, scheduling, and completion tracking
- `assignments` - Academic assignments with due dates and progress
- `courses` - Course information with colors and schedules
- `week_plans` - Weekly planning structures
- `day_plan_assignments` - Assignment-to-day mappings
- `journal_entries` - Mood journal entries
- `user_settings` - User preferences (day reset time, etc.)

### Key Features
- Row Level Security (RLS) for user data isolation
- Composite indexes for performance
- JSON fields for flexible data (selected_days, completion_history)

## 🎨 Design System

- **Color-Coded Sections**: Each feature has distinct gradient backgrounds
- **Shadow Box Pattern**: Consistent elevated UI elements with customizable shadows
- **Time-Based Gradients**: Background colors change throughout the day
- **Smooth Animations**: Spring animations for drawer, loading states, and interactions

## 🚀 Key Technical Implementations

### Smart Caching System
```typescript
// 7-day cache window strategy
const CACHE_WINDOW_DAYS = 3; // ±3 days from today
- Load from cache instantly (no loading state for recent dates)
- Fetch fresh data in background
- Show loading only when viewing dates outside cache window
```

### Custom Date Handling
```typescript
// Prevents timezone bugs with local date utilities
- formatLocalDate(date): YYYY-MM-DD in local timezone
- parseLocalDate(string): Date object without timezone conversion
- getHabitDate(date, resetHour, resetMinute): Respects custom day boundaries
```

### Optimistic Updates
```typescript
// Instant UI feedback with automatic rollback
1. Update UI immediately
2. Send request to Supabase in background
3. Update cache
4. Rollback on error
```

## 📱 Screens & Navigation

- **Habits**: Main habit tracking with date navigation
- **Assignments**: Course and assignment management with week planning
- **Quests**: Long-term goal system (in development)
- **Profile**: User statistics and achievements
- **More Drawer**: Journal, Focus Timer, Settings, All Goals, Rewards

## 🔐 Authentication & Security

- Supabase Auth with email/password
- Protected routes with automatic redirect
- Row Level Security on all database tables
- User-specific data isolation

## 📊 Performance Optimizations

- FlatList virtualization for long lists
- Memoized components and callbacks
- Debounced async operations
- Lazy loading of images and heavy components
- Background data syncing

## 🐛 Known Issues & Future Improvements

- [ ] Quest system implementation
- [ ] Path/category system for habit organization
- [ ] Social features (habit sharing, friend streaks)
- [ ] Push notifications for reminders
- [ ] Data export functionality
- [ ] Dark mode support

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome! Feel free to open issues for bugs or feature requests.

## 📄 License

MIT License - see LICENSE file for details

## 👨‍💻 Author

Zainab Khoshnaw
- GitHub: [@zainabkho](https://github.com/zainabkho)
- LinkedIn: [Your LinkedIn](https://linkedin.com/in/zainab-khoshnaw)

## 🙏 Acknowledgments

- Icons from Flaticon
- Fonts: Apercu and Inter

---

**Built with React Native, TypeScript, and Supabase**
