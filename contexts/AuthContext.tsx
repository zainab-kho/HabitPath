// @/contexts/AuthContext.tsx
import { supabase } from '@/lib/supabase'
import { migrateExistingEntriesToEncrypted } from '@/lib/journal-migration'
import { CURRENT_CACHE_VERSION, STORAGE_KEYS } from '@/storage/keys'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'

interface AuthContextType {
  user: User | null
  loading: boolean
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

  useEffect(() => {
    // run one-time cache migration before checking session
    runCacheMigration().then(() => {
      // check if user is already logged in
      supabase.auth.getSession().then(({ data: { session } }) => {
        // **LOG
        console.log('[**LOG auth] restored session for user:', session?.user?.email ?? 'none')
        setUser(session?.user ?? null)
        setLoading(false)

        // migrate existing journal entries to encrypted (background, one-time)
        if (session?.user) {
          migrateExistingEntriesToEncrypted(session.user.id).catch(console.error)
        }
      })
    })

    // listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
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
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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