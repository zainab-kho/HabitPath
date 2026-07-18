// @/modals/FeedbackModal.tsx
// Feedback report modal — opened from Settings ("Send Feedback") and from the
// floating feedback button on every page (which passes the current page so
// reports say where the problem happened).
import { BUTTON_COLORS, PAGE } from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { submitFeedback } from '@/lib/supabase/queries/feedback';
import { globalStyles, uiStyles } from '@/styles';
import ShadowBox from '@/ui/ShadowBox';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  // the page the user was on when they opened the modal (null = from settings)
  page?: string | null;
}

export default function FeedbackModal({ visible, onClose, page = null }: Props) {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // fresh text each time the modal opens
  useEffect(() => {
    if (visible) setMessage('');
  }, [visible]);

  const send = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    try {
      await submitFeedback(user.id, message, page);
      Keyboard.dismiss();
      onClose();
      Alert.alert('Thank you!', 'Your feedback was sent.');
    } catch (err) {
      console.error('Error sending feedback:', err);
      Alert.alert('Error', 'Could not send feedback. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          <View style={{ marginTop: 20, paddingHorizontal: 20 }}>
            <Text style={[globalStyles.h3, { textAlign: 'center', marginBottom: 6 }]}>
              Send Feedback
            </Text>
            <Text style={[globalStyles.body2, { textAlign: 'center', opacity: 0.6, fontSize: 13, marginBottom: 16 }]}>
              Found a bug or have an idea? Tell me about it!
            </Text>

            <TextInput
              style={[uiStyles.inputField, styles.input]}
              value={message}
              onChangeText={setMessage}
              placeholder="What happened / what would you like?"
              placeholderTextColor="rgba(0,0,0,0.35)"
              multiline
              autoFocus
            />

            {page && (
              <Text style={[globalStyles.label, { marginTop: 8 }]}>
                PAGE: {page.toUpperCase()}
              </Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', borderTopWidth: 1, padding: 10, gap: 10, marginTop: 16 }}>
            <Pressable onPress={onClose} style={{ flex: 1 }} disabled={sending}>
              <ShadowBox contentBackgroundColor={BUTTON_COLORS.Quiet} shadowBorderRadius={15}>
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>Cancel</Text>
                </View>
              </ShadowBox>
            </Pressable>
            <Pressable onPress={send} style={{ flex: 1 }} disabled={sending || !message.trim()}>
              <ShadowBox
                contentBackgroundColor={BUTTON_COLORS.Save}
                shadowBorderRadius={15}
                style={{ opacity: sending || !message.trim() ? 0.5 : 1 }}
              >
                <View style={{ paddingVertical: 6 }}>
                  <Text style={[globalStyles.body, { textAlign: 'center' }]}>
                    {sending ? 'Sending…' : 'Send'}
                  </Text>
                </View>
              </ShadowBox>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: PAGE.habits.primary[0],
    width: '90%',
    alignSelf: 'center',
  },
  input: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
});
