# HabitPath

A habit tracker that also handles journaling, notes, and coursework. Built with React Native and Expo, currently in beta on TestFlight.

<p align="center">
  <img src="https://github.com/user-attachments/assets/c967af7a-262d-4049-a7ad-ee3fa2707350" width="250" />
  <img src="https://github.com/user-attachments/assets/82dbe02b-c61d-40cf-bf36-70800cbb5007" width="250" />
  <img src="https://github.com/user-attachments/assets/3c77dac7-da57-4d72-ab19-1237d7ad654d" width="250" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/fe505ee0-0faf-4729-8df1-f0fb9a95a352" width="250" />
  <img src="https://github.com/user-attachments/assets/f77bb4b1-0bcb-4664-bfd2-7f0d406f2059" width="250" />
</p>

## Why I built it

Most habit apps assume every habit is the same shape: do this every day, don't break the streak. Mine aren't like that. Some are "three times this week, I don't care which days." Some carry over until they're actually done. Some happen in whatever week the 16th falls in. I wanted a tracker that could express those without flattening them into daily streaks, and it grew from there into the rest of the things I was tracking across four different apps.

## What it does

**Habits** run on daily, weekly, monthly, or every-N-days schedules. Monthly ones can anchor to a date or to a weekday-of-month ("third Tuesday"). Beyond plain checkboxes there are counters with goals, time tracking, snooze, skip, and habits that keep carrying forward until you actually finish them. Each one can be worth reward points.

**Week goals** are scoped to a whole week instead of a day — "read 3 times this week" fills up as you go and resets when the week rolls over. They can repeat weekly, or only in the week containing a particular day of the month.

**Paths** group related habits and give you a completion heat map plus week-over-week and month-over-month trends.

**Journal** has moods, optional end-to-end encryption, and works offline. **Notes** is a rich-text editor with folders and checklists. **Assignments** tracks courses, due dates, and weekly planning. There's also a focus timer, a points-based rewards wishlist, and a stats page.

## The parts that were actually interesting

### End-to-end encrypted journal

Journal entries are encrypted on the device, so Supabase only ever stores ciphertext. I can't read them either — that was the point.

Turning it on generates a random 256-bit master key and wraps it twice: once under a key derived from your passphrase with Argon2id, once under a randomly generated recovery code. Both wrapped copies go in Postgres, and neither is worth anything without the matching secret. The master key itself lives in the iOS Keychain, so day to day the journal just opens normally — you only re-enter the passphrase on a new device or after signing out.

Entries are encrypted field by field with XChaCha20-Poly1305 before they leave the phone, and the offline cache is encrypted as a whole blob under the same key. Ciphertext carries a version prefix (`enc1:`), which is what let me migrate the plaintext entries I'd already written in the background while both formats coexisted.

The tradeoff worth naming: there's no password reset. Lose both the passphrase and the recovery code and those entries are gone for good. That's what "I can't read them either" actually costs.

### Dates are harder than they look

A habit day doesn't end at midnight, it ends at whatever hour you set (4 AM by default), so something you check off at 1 AM still counts for the day before. Weeks start on whichever day you pick, which matters more than it sounds — week goals and "move this habit to Thursday" are both keyed to the start of the week, so if that setting hasn't loaded by the time the habit list renders, moved habits quietly snap back to their original day.

All of it goes through `utils/dateUtils.ts` instead of raw `Date` math. Every time I've bypassed that I've gotten an off-by-one, usually around midnight or the week rollover.

### Offline-first

Reads come from an AsyncStorage cache first and sync to Supabase in the background. Writes hit local state immediately and get flagged `pendingSync` if the request fails, then retry on the next load. It isn't real-time — there are no subscriptions — but the app opens instantly and keeps working with no connection.

## Stack

- **React Native** 0.81.5 / **Expo** 54, **TypeScript**, **React** 19
- **expo-router** for file-based navigation
- **Supabase** — Postgres, Auth, and row-level security on every table
- **AsyncStorage** for the offline cache, **expo-secure-store** for the encryption key
- [`@noble/ciphers`](https://github.com/paulmillr/noble-ciphers) and [`@noble/hashes`](https://github.com/paulmillr/noble-hashes) for XChaCha20-Poly1305 and Argon2id
- [`@10play/tentap-editor`](https://github.com/10play/10tap-editor) for the notes editor

## Running it

You'll need Node 18+, a Supabase project, and Xcode for iOS builds.

```bash
git clone https://github.com/zainab-kho/HabitPath.git
cd HabitPath
npm install
```

Add a `.env` in the root:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Run the SQL files in `supabase/` against your project to create the tables and policies, then:

```bash
npx expo run:ios
```

This needs a development build rather than Expo Go, since it uses native modules (secure storage, the editor WebView). On macOS, CocoaPods can fail on a locale issue — running `export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` first fixes it.

## Layout

```
app/                    Expo Router screens
  (tabs)/habits/        habit list, new/edit habit, inbox
  (tabs)/paths/         path list and detail with heat map
  (tabs)/more/          journal, notes, assignments, focus, rewards, stats, settings
  auth/                 login, forgot/reset password
components/             habit rows, assignment cards, journal pieces
hooks/                  useHabits, useAssignmentData, useAssignmentActions
lib/
  crypto/               journal encryption — key derivation, vault, keychain
  journal/              entry encryption, migration, offline cache
  supabase/queries/     all database access
modals/                 detail and picker modals
utils/
  dateUtils.ts          all date math (day reset, week starts, formatting)
  habitUtils.ts         scheduling, visibility, status, streaks
```

## Status

In beta on TestFlight. Built and tested on iOS; Android isn't ruled out, I just haven't tried it.

Not done yet:

- **Quests** — a long-term goal system with phases. Mostly built, but hidden behind a flag until I finish it.
- **Profile** — still a stub.
- Push notifications, data export, and dark mode.

## License

MIT — see [LICENSE](LICENSE).

Icons from [Icons8](https://icons8.com). Fonts are Apercu and Inter.
