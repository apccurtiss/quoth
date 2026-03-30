import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

interface EditQuoteModalProps {
  visible: boolean;
  currentText: string;
  onSave: (newText: string) => void;
  onCancel: () => void;
}

export function EditQuoteModal({
  visible,
  currentText,
  onSave,
  onCancel,
}: EditQuoteModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [text, setText] = useState(currentText);

  useEffect(() => {
    if (visible) setText(currentText);
  }, [visible, currentText]);

  const canSave = text.trim().length > 0 && text.trim() !== currentText;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Quote</Text>

          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.icon + '40',
                backgroundColor: colors.background,
              },
            ]}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
            selectTextOnFocus
            textAlignVertical="top"
          />

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={[styles.cancelText, { color: colors.icon }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.tint,
                  opacity: canSave ? 1 : 0.5,
                },
              ]}
              onPress={() => onSave(text.trim())}
              disabled={!canSave}
            >
              <Text style={styles.saveText}>Save</Text>
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
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    lineHeight: 22,
    marginBottom: 20,
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
  saveButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
