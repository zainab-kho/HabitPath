// @/contexts/AuthContext.tsx
import { lockThisDevice } from '@/lib/crypto/journalVault'
import { supabase } from '@/lib/supabase'
import { CURRENT_CACHE_VERSION, STORAGE_KEYS } from '@/storage/keys'
import { setWeekStartDay } from '@/utils/dateUtils'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { Alert } from 'react-native'

// Supabase returns auth tokens in the URL fragment (#...), and errors in the query
// string — collect params from both so we can start the recovery session.
function paramsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {}
  const hashIndex = url.indexOf('#')
  const queryIndex = url.indexOf('?')
  const collect = (segment?: string) => {
    if (!segment) return
    for (const pair of segment.split('&')) {
      if (!pair) continue
      const [k, v] = pair.split('=')
      // '+' means space in query encoding (Supabase encodes error messages this way)
      if (k) out[decodeURIComponent(k)] = decodeURIComponent((v ?? '').replace(/\+/g, ' '))
    }
  }
  if (queryIndex >= 0) collect(url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined))
  if (hashIndex >= 0) collect(url.slice(hashIndex + 1))
  return out
}

interface AuthContextType {
  user: User | null
  loading: boolean
  isPasswordRecovery: boolean
  // set during the code reset flow; the ResetPassword screen shows a code
  // field when this is present
  recoveryEmail: string | null
  startCodeRecovery: (email: string) => Promise<void>
  clearPasswordRecovery: () => void
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// **LOG one-time migration: wipes stale AsyncStorage from old app versions
// bump CURRENT_CACHE_VERSION in storage/keys.ts whenever you need to force a re-wipe
const runCacheMigration = async () => {
  const stored = await AsyncStorage.getItem(STORAGE_KEYS.CACHE_VERSION)
  // **LOG
  console.log('[**LOG migration] stored cache version:', stored, '| required:', CURRENT_CACHE_VERSION)

  if (stored === CURRENT_CACHE_VERSION) return

  console.log('[**LOG migration] stale cache detected — wiping all AsyncStorage keys')
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.RESET_TIME,
    STORAGE_KEYS.TOTAL_POINTS,
    STORAGE_KEYS.HABITS_CACHE,
    STORAGE_KEYS.HABITS_DIRTY,
    STORAGE_KEYS.TOGGLE_STATE,
    STORAGE_KEYS.JOURNAL_CACHE,
    STORAGE_KEYS.JOURNAL_DIRTY,
    STORAGE_KEYS.USER_SETTINGS,
    STORAGE_KEYS.ONBOARDING_COMPLETE,
    STORAGE_KEYS.REWARDS,
    STORAGE_KEYS.REDEEMED_POINTS,
    STORAGE_KEYS.EXCHANGE_RATE,
    // legacy keys from before @-prefix convention
    'resetTime', 'habits', 'habitProgress', 'todayProgress', 'journal_entries',
  ])
  await AsyncStorage.setItem(STORAGE_KEYS.CACHE_VERSION, CURRENT_CACHE_VERSION)
  console.log('[**LOG migration] done — cache version set to', CURRENT_CACHE_VERSION)
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null)

  // code reset flow: email the code, then flip into recovery mode — the root
  // layout routes to the ResetPassword screen, which collects the code + new password.
  const startCodeRecoveryHandler = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
    setRecoveryEmail(email)
    setIsPasswordRecovery(true)
  }

  // week-start day drives all week math (weekly goals, temp moves, heat maps).
  // It must load with the session — previously only the Settings page loaded it,
  // so a fresh install/login computed Sunday-based weeks until Settings was opened,
  // breaking week-keyed data like "moved this week" days.
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        const { data } = await supabase
          .from('user_settings')
          .select('week_start_day')
          .eq('user_id', user.id)
          .single()
        if (data?.week_start_day) {
          setWeekStartDay(data.week_start_day)
          await AsyncStorage.setItem(STORAGE_KEYS.USER_DAY_OF_WEEK_CHOICE, data.week_start_day)
        }
      } catch {}
    })()
  }, [user])

  useEffect(() => {
    // run one-time cache migration before checking session
    runCacheMigration().then(() => {
      // check if user is already logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        // **LOG
        console.log('[**LOG auth] restored session for user:', session?.user?.email ?? 'none')
        setUser(session?.user ?? null)
        setLoading(false)
      })
    })

    // listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Handle password-reset deep links (habitpath://reset-password#access_token=...&type=recovery).
  // detectSessionInUrl is off for React Native, so we parse the tokens ourselves, start the
  // recovery session, and flip into recovery mode (which routes to the ResetPassword screen).
  useEffect(() => {
    // Safari's "Open HabitPath?" flow often makes the user tap the email link twice,
    // so the app can receive BOTH a valid token delivery and an "otp expired" error
    // for the same reset. Once recovery is established, ignore the stray error.
    let recovered = false

    const handleUrl = async (url: string | null) => {
      if (!url) return
      const params = paramsFromUrl(url)

      if (params.type === 'recovery' && params.access_token && params.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        })
        if (error) {
          Alert.alert('Reset link problem', 'This password reset link is invalid or has expired. Please request a new one.')
          return
        }
        recovered = true
        setIsPasswordRecovery(true)
        return
      }

      // an expired/used link comes back with an error instead of tokens
      if (!recovered && (params.error_description || params.error)) {
        Alert.alert('Reset link problem', params.error_description || 'This link is invalid or has expired. Please request a new one.')
      }
    }

    // cold start (app opened by the link) + warm (app already running)
    Linking.getInitialURL().then(handleUrl)
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url))
    return () => sub.remove()
  }, [])

  const signUpHandler = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    setUser(data.user)
  }

  const signInHandler = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    // **LOG
    console.log('[**LOG auth] signed in as:', data.user?.email)
    setUser(data.user)
  }

  const signOutHandler = async () => {
    // **LOG
    console.log('[**LOG auth] signing out — clearing AsyncStorage cache keys')
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.RESET_TIME,
      STORAGE_KEYS.HABITS_CACHE,
      STORAGE_KEYS.HABITS_DIRTY,
      STORAGE_KEYS.TOGGLE_STATE,
      STORAGE_KEYS.JOURNAL_CACHE,
      STORAGE_KEYS.JOURNAL_DIRTY,
      STORAGE_KEYS.USER_SETTINGS,
      STORAGE_KEYS.TOTAL_POINTS,
      STORAGE_KEYS.REDEEMED_POINTS,
      STORAGE_KEYS.EXCHANGE_RATE,
    ])
    // lock the encrypted journal on this device: clear the master key from the
    // keychain so signing back in requires the passphrase again
    if (user?.id) {
      try { await lockThisDevice(user.id) } catch (err) {
        console.error('[auth] failed to lock journal on sign-out:', err)
      }
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isPasswordRecovery,
        recoveryEmail,
        startCodeRecovery: startCodeRecoveryHandler,
        clearPasswordRecovery: () => {
          setIsPasswordRecovery(false)
          setRecoveryEmail(null)
        },
        signUp: signUpHandler,
        signIn: signInHandler,
        signOut: signOutHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}