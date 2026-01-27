// @/app/auth/LoginScreen.tsx
import { PAGE } from '@/constants/colors'
import { useAuth } from '@/contexts/AuthContext'
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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    // validate password confirmation for sign up
    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match')
        return
      }
      if (password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters')
        return
      }
    }

    setLoading(true)

    try {
      if (isSignUp) {
        await signUp(email, password)
        Alert.alert(
          'Success!',
          'Account created! You can now sign in.',
          [{ text: 'OK', onPress: resetToLogin }]
        )
      } else {
        await signIn(email, password)
      }
    } catch (error: any) {
      Alert.alert('Error', error.message)
    } finally {
      setLoading(false)
    }
  }

  const resetToLogin = () => {
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setIsSignUp(false)
    Keyboard.dismiss()
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setConfirmPassword('') // clear confirmation when switching
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
              {/* Header with subtitle */}
              <View style={{ marginBottom: 24, alignItems: 'center' }}>
                <Text style={[globalStyles.h1, { marginBottom: 8 }]}>
                  {isSignUp ? 'Create account' : 'Welcome back'}
                </Text>
                <Text style={[globalStyles.body, { 
                  color: 'rgba(0,0,0,0.6)',
                  fontSize: 14,
                }]}>
                  {isSignUp 
                    ? 'Start your habit tracking journey' 
                    : 'Continue building great habits'}
                </Text>
              </View>

              {/* Email field */}
              <Text style={globalStyles.label}>EMAIL</Text>
              <TextInput
                style={[uiStyles.inputField, {
                  borderColor: PAGE.auth.border[0],
                }]}
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
              />

              {/* Password field */}
              <Text style={globalStyles.label}>PASSWORD</Text>
              <TextInput
                style={[uiStyles.inputField, {
                  borderColor: PAGE.auth.border[0],
                }]}
                placeholder={isSignUp ? "At least 6 characters" : "Password"}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType={isSignUp ? "next" : "done"}
                onSubmitEditing={isSignUp ? undefined : handleAuth}
              />

              {/* Confirm password - only show for sign up */}
              {isSignUp && (
                <>
                  <Text style={globalStyles.label}>CONFIRM PASSWORD</Text>
                  <TextInput
                    style={[uiStyles.inputField, {
                      borderColor: PAGE.auth.border[0],
                    }]}
                    placeholder="Re-enter your password"
                    placeholderTextColor={'#000'}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    returnKeyType="done"
                    onSubmitEditing={handleAuth}
                  />
                </>
              )}

              {/* Main action button */}
              <Pressable
                onPress={handleAuth}
                disabled={loading}
                style={({ pressed }) => [
                  buttonStyles.button,
                  {
                    backgroundColor: isSignUp ? '#7FD1AE' : '#FED0FF',
                    width: '100%',
                    marginTop: 8,
                    marginBottom: 20,
                  },
                  loading && { opacity: 0.5 },
                  pressed && !loading && { opacity: 0.8 },
                ]}
              >
                <Text style={[globalStyles.body, { fontSize: 16 }]}>
                  {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              </Pressable>

              {/* Toggle between sign in/sign up */}
              <View style={{
                paddingTop: 20,
                borderTopWidth: 1,
                borderTopColor: 'rgba(0,0,0,0.1)',
              }}>
                <Text
                  style={{
                    fontFamily: 'p3',
                    fontSize: 14,
                    color: 'rgba(0,0,0,0.6)',
                    textAlign: 'center',
                  }}
                >
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <Pressable
                  onPress={toggleMode}
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
                    {isSignUp ? 'Sign In' : 'Sign Up'}
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