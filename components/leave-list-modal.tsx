import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

interface LeaveListModalProps {
  visible: boolean;
  alias: string;
  quoteCount: number;
  collaboratorCount: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function LeaveListModal({
  visible,
  alias,
  quoteCount,
  collaboratorCount,
  onConfirm,
  onCancel,
}: LeaveListModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [leaving, setLeaving] = useState(false);

  async function handleConfirm() {
    setLeaving(true);
    try {
      await onConfirm();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Leave "{alias}"?
          </Text>

          <Text style={[styles.body, { color: colors.icon }]}>
            A personal copy will be created with all {quoteCount} current
            quote{quoteCount !== 1 ? 's' : ''}. You'll no longer receive
            new quotes from the other{' '}
            {collaboratorCount - 1} collaborator
            {collaboratorCount - 1 !== 1 ? 's' : ''}.
          </Text>

          <View style={styles.buttons}>
            <Pressable
              style={styles.cancelButton}
              onPress={onCancel}
              disabled={leaving}
            >
              <Text style={[styles.cancelText, { color: colors.icon }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[styles.confirmButton, { backgroundColor: '#e74c3c' }]}
              onPress={handleConfirm}
              disabled={leaving}
            >
              {leaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.confirmText}>Leave list</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
