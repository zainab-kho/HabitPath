// @/components/FeedbackButton.tsx
// Small floating tab pinned to the left edge of every page (mounted globally in
// app/_layout.tsx). Opens the feedback modal with the current page autofilled so
// reports say where the user was. Hidden while signed out.
import { SYSTEM_ICONS } from '@/constants/icons';
import { useAuth } from '@/contexts/AuthContext';
import FeedbackModal from '@/modals/FeedbackModal';
import { usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet } from 'react-native';

export default function FeedbackButton() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
        hitSlop={8}
      >
        <Image source={SYSTEM_ICONS.feedback} style={styles.icon} />
      </Pressable>

      <FeedbackModal visible={open} onClose={() => setOpen(false)} page={pathname} />
    </>
  );
}

const styles = StyleSheet.create({
  tab: {
    position: 'absolute',
    left: 0,
    top: '83%',
    backgroundColor: '#fff',
    opacity: 0.7,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: '#000',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingVertical: 10,
    paddingLeft: 6,
    paddingRight: 8,
    zIndex: 40,
  },
  icon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },
});
