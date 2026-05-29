-- Run this in Supabase SQL Editor to create the encryption key backup table.
-- This stores a PIN-encrypted copy of each user's journal encryption key
-- so they can recover on a new device.

CREATE TABLE encryption_key_backups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  encrypted_key text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Row Level Security — users can only access their own key backup
ALTER TABLE encryption_key_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own key backup"
  ON encryption_key_backups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own key backup"
  ON encryption_key_backups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own key backup"
  ON encryption_key_backups FOR UPDATE
  USING (auth.uid() = user_id);
