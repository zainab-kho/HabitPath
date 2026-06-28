// @/app/auth/ResetPassword.tsx
import { PAGE } from '@/constants/colors'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { buttonStyles, globalStyles, uiStyles } from '@/styles'
import { AppLinearGradient } from '@/ui/AppLinearGradient'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native'

export default function ResetPassword() {
  const router = useRouter()
  const { clearPasswordRecovery } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdatePassword = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter a new password')
      return
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      clearPasswordRecovery()
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'OK', onPress: () => router.replace('/') },
      ])
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLinearGradient variant="auth.background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -150 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center',
              paddingHorizontal: 20,
              paddingVertical: 40,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 20,
              padding: 24,
              borderWidth: 1,
              borderColor: '#000',
            }}>
              <View style={{ marginBottom: 24, alignItems: 'center' }}>
                <Text style={[globalStyles.h1, { marginBottom: 8 }]}>
                  New Password
                </Text>
                <Text style={[globalStyles.body, {
                  color: 'rgba(0,0,0,0.6)',
                  fontSize: 14,
                  textAlign: 'center',
                }]}>
                  Enter your new password below
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                <Text style={globalStyles.label}>NEW PASSWORD</Text>
                <TextInput
                  style={[uiStyles.inputField, {
                    borderColor: PAGE.auth.border[0],
                    marginBottom: 15,
                  }]}
                  placeholder="At least 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="next"
                />
              </View>

              <View style={{ gap: 10 }}>
                <Text style={globalStyles.label}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={[uiStyles.inputField, {
                    borderColor: PAGE.auth.border[0],
                    marginBottom: 15,
                  }]}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleUpdatePassword}
                />
              </View>

              <Pressable
                onPress={handleUpdatePassword}
                disabled={loading}
                style={({ pressed }) => [
                  buttonStyles.button,
                  {
                    backgroundColor: '#7FD1AE',
                    width: '100%',
                    marginTop: 8,
                  },
                  loading && { opacity: 0.5 },
                  pressed && !loading && { opacity: 0.8 },
                ]}
              >
                <Text style={[globalStyles.body, { fontSize: 16 }]}>
                  {loading ? 'Updating...' : 'Update Password'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AppLinearGradient>
  )
}
