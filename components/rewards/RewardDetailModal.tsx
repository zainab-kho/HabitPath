import { globalStyles, buttonStyles } from '@/styles';
import { BUTTON_COLORS } from '@/constants/colors';
import React from 'react';
import { Alert, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Reward } from '@/types/Reward';
import { SYSTEM_ICONS } from '@/constants/icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  reward: Reward | null;
  onDelete: (id: string) => void;
}

export default function RewardDetailModal({ visible, onClose, reward, onDelete }: Props) {
  if (!reward) return null;

  const handleDelete = () => {
    Alert.alert(
      'Delete Reward?',
      `Are you sure you want to delete "${reward.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(reward.id);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <Text style={globalStyles.h3}>Reward Details</Text>
            <TouchableOpacity onPress={onClose} style={s.closeButton}>
              <Text style={{ fontSize: 22, color: '#666' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Preview Card */}
            <View style={[s.previewCard, { backgroundColor: reward.backgroundColor || '#FFF3D0' }]}>
              <View style={s.imageContainer}>
                {reward.photoUri ? (
                  <Image source={{ uri: reward.photoUri }} style={s.cardImage} />
                ) : (
                  <View style={[s.cardImage, { justifyContent: 'center', alignItems: 'center', backgroundColor: reward.backgroundColor || '#FFF3D0' }]}>
                    <Image
                      source={SYSTEM_ICONS.gift}
                      style={{ width: 60, height: 60, tintColor: '#FFD581' }}
                    />
                  </View>
                )}
              </View>

              <Text style={[globalStyles.h4, { textAlign: 'center', marginBottom: 8 }]}>{reward.name}</Text>

              <View style={s.pointsBadge}>
                <Image
                  source={SYSTEM_ICONS.reward}
                  style={{ width: 14, height: 14 }}
                />
                <Text style={[globalStyles.label, { color: 'black', fontSize: 12, opacity: 1 }]}>
                  {reward.costPoints} pts (${reward.costDollars.toFixed(2)})
                </Text>
              </View>

              {reward.tags && reward.tags.length > 0 && (
                <View style={s.tagsContainer}>
                  {reward.tags.map(tag => (
                    <View key={tag} style={s.tag}>
                      <Text style={{ fontSize: 10, fontFamily: 'label' }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Notes */}
            {reward.notes && (
              <View style={{ marginBottom: 20 }}>
                <Text style={[globalStyles.body1, { marginBottom: 8 }]}>Notes</Text>
                <View style={s.notesBox}>
                  <Text style={[globalStyles.label, { fontSize: 13, lineHeight: 20, opacity: 1 }]}>{reward.notes}</Text>
                </View>
              </View>
            )}

            {/* Details */}
            <View style={{ marginBottom: 20 }}>
              <Text style={[globalStyles.body1, { marginBottom: 8 }]}>Details</Text>
              <View style={s.detailRow}>
                <Text style={[globalStyles.label, { fontSize: 13, color: '#666' }]}>Added:</Text>
                <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>{reward.dateAdded}</Text>
              </View>
              <View style={s.detailRow}>
                <Text style={[globalStyles.label, { fontSize: 13, color: '#666' }]}>Cost:</Text>
                <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>
                  ${reward.costDollars.toFixed(2)} ({reward.costPoints} points)
                </Text>
              </View>
              {reward.isClaimed && reward.dateClaimed && (
                <View style={s.detailRow}>
                  <Text style={[globalStyles.label, { fontSize: 13, color: '#666' }]}>Claimed:</Text>
                  <Text style={[globalStyles.label, { fontSize: 13, opacity: 1 }]}>{reward.dateClaimed}</Text>
                </View>
              )}
            </View>

            {/* Delete */}
            <TouchableOpacity onPress={handleDelete} style={s.deleteButton}>
              <Text style={[globalStyles.body, { color: '#fff' }]}>Delete Reward</Text>
            </TouchableOpacity>
          </ScrollView>

          <View style={{ borderTopWidth: 1, borderTopColor: '#000' }}>
            <TouchableOpacity onPress={onClose} style={s.doneButton}>
              <Text style={globalStyles.body}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCard: {
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    alignItems: 'center',
    marginBottom: 20,
    width: 160,
    alignSelf: 'center',
  },
  imageContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    marginBottom: 12,
    elevation: 4,
  },
  cardImage: {
    height: 100,
    width: 100,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 4,
  },
  pointsBadge: {
    backgroundColor: 'rgba(255, 243, 220, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 213, 137, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    justifyContent: 'center',
  },
  tag: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  notesBox: {
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  deleteButton: {
    backgroundColor: BUTTON_COLORS.Delete,
    padding: 10,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#000',
    alignSelf: 'center',
    alignItems: 'center',
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginTop: 8,
  },
  doneButton: {
    backgroundColor: '#FFD581',
    width: 200,
    padding: 8,
    margin: 20,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: '#000',
    alignSelf: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
});
