// @/app/auth/ForgotPassword.tsx
import { PAGE } from '@/constants/colors'
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

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleReset = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'habitpath://reset-password',
      })
      if (error) throw error
      setSent(true)
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
                  Reset Password
                </Text>
                <Text style={[globalStyles.body, {
                  color: 'rgba(0,0,0,0.6)',
                  fontSize: 14,
                  textAlign: 'center',
                }]}>
                  {sent
                    ? 'Check your inbox for the reset link'
                    : "Enter your email and we'll send you a reset link"}
                </Text>
              </View>

              {!sent ? (
                <>
                  <View style={{ gap: 10 }}>
                    <Text style={globalStyles.label}>EMAIL</Text>
                    <TextInput
                      style={[uiStyles.inputField, {
                        borderColor: PAGE.auth.border[0],
                        marginBottom: 15,
                      }]}
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      returnKeyType="done"
                      onSubmitEditing={handleReset}
                    />
                  </View>

                  <Pressable
                    onPress={handleReset}
                    disabled={loading}
                    style={({ pressed }) => [
                      buttonStyles.button,
                      {
                        backgroundColor: '#FED0FF',
                        width: '100%',
                        marginTop: 8,
                        marginBottom: 20,
                      },
                      loading && { opacity: 0.5 },
                      pressed && !loading && { opacity: 0.8 },
                    ]}
                  >
                    <Text style={[globalStyles.body, { fontSize: 16 }]}>
                      {loading ? 'Sending...' : 'Send Reset Link'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={handleReset}
                  disabled={loading}
                  style={({ pressed }) => [
                    buttonStyles.button,
                    {
                      backgroundColor: '#FED0FF',
                      width: '100%',
                      marginBottom: 20,
                    },
                    loading && { opacity: 0.5 },
                    pressed && !loading && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[globalStyles.body, { fontSize: 16 }]}>
                    {loading ? 'Sending...' : 'Resend Link'}
                  </Text>
                </Pressable>
              )}

              <View style={{
                paddingTop: 20,
                borderTopWidth: 1,
                borderTopColor: 'rgba(0,0,0,0.1)',
              }}>
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => ({
                    paddingVertical: 8,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: PAGE.auth.border[0],
                      fontFamily: 'p1',
                      fontSize: 16,
                      textAlign: 'center',
                    }}
                  >
                    Back to Sign In
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </AppLinearGradient>
  )
}
