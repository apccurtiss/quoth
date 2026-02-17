import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { QuoteList } from '@/types';

interface MergeListsModalProps {
  visible: boolean;
  currentList: QuoteList;
  currentAlias: string;
  currentQuoteCount: number;
  mergeableLists: { list: QuoteList; alias: string; quoteCount: number }[];
  onConfirm: (mergeListId: string) => Promise<void>;
  onCancel: () => void;
}

export function MergeListsModal({
  visible,
  currentList,
  currentAlias,
  currentQuoteCount,
  mergeableLists,
  onConfirm,
  onCancel,
}: MergeListsModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const selectedEntry = mergeableLists.find(
    (e) => e.list.id === selected,
  );

  function handleBack() {
    if (step === 'confirm') {
      setStep('select');
    } else {
      setSelected(null);
      setStep('select');
      onCancel();
    }
  }

  async function handleConfirm() {
    if (!selected) return;
    setConfirming(true);
    try {
      await onConfirm(selected);
    } finally {
      setConfirming(false);
      setStep('select');
      setSelected(null);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          {step === 'select' ? (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                Merge lists
              </Text>
              {mergeableLists.length === 0 ? (
                <Text style={[styles.subtitle, { color: colors.icon }]}>
                  You have no other lists to merge into "{currentAlias}".
                </Text>
              ) : (
                <Text style={[styles.subtitle, { color: colors.icon }]}>
                  Select a list to merge into "{currentAlias}":
                </Text>
              )}

              <FlatList
                data={mergeableLists}
                keyExtractor={(item) => item.list.id!}
                style={styles.list}
                renderItem={({ item }) => (
                  <Pressable
                    style={[
                      styles.listItem,
                      {
                        borderColor:
                          selected === item.list.id
                            ? colors.tint
                            : colors.icon + '30',
                        backgroundColor:
                          selected === item.list.id
                            ? colors.tint + '15'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => setSelected(item.list.id!)}
                  >
                    <Text
                      style={[styles.listItemName, { color: colors.text }]}
                    >
                      {item.alias}
                    </Text>
                    <Text
                      style={[styles.listItemMeta, { color: colors.icon }]}
                    >
                      {item.quoteCount} quote
                      {item.quoteCount !== 1 ? 's' : ''}
                      {'  ·  '}
                      {item.list.collaborators.length} collaborator
                      {item.list.collaborators.length !== 1 ? 's' : ''}
                    </Text>
                  </Pressable>
                )}
              />

              <View style={styles.buttons}>
                <Pressable style={styles.cancelButton} onPress={handleBack}>
                  <Text
                    style={[styles.cancelText, { color: colors.icon }]}
                  >
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.confirmButton,
                    {
                      backgroundColor: colors.tint,
                      opacity: selected ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => setStep('confirm')}
                  disabled={!selected}
                >
                  <Text style={styles.confirmText}>Next</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                Confirm merge
              </Text>
              <Text style={[styles.body, { color: colors.icon }]}>
                Merging "{selectedEntry?.alias}" into "{currentAlias}".
                {'\n\n'}
                The merged list will have{' '}
                {currentQuoteCount + (selectedEntry?.quoteCount ?? 0)} quotes
                and all collaborators from both lists.
                {'\n\n'}
                "{selectedEntry?.alias}" will be deleted.
              </Text>

              <View style={styles.buttons}>
                <Pressable style={styles.cancelButton} onPress={handleBack}>
                  <Text
                    style={[styles.cancelText, { color: colors.icon }]}
                  >
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.confirmButton,
                    { backgroundColor: colors.tint },
                  ]}
                  onPress={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>Merge</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
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
    maxHeight: '75%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  list: {
    marginBottom: 16,
  },
  listItem: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  listItemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  listItemMeta: {
    fontSize: 13,
    marginTop: 2,
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
