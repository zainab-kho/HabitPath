// Deep-link target for Supabase password-reset emails (habitpath://reset-password).
// Renders the ResetPassword screen; AuthContext's deep-link handler establishes the
// recovery session from the URL tokens, and the router also steers here via
// isPasswordRecovery.
import ResetPasswordScreen from './auth/ResetPassword'

export default function ResetPasswordRoute() {
  return <ResetPasswordScreen />
}
