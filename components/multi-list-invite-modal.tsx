import { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { createMultiListInvite } from '@/services/firestore';
import type { QuoteList } from '@/types';

interface MultiListInviteModalProps {
  visible: boolean;
  lists: QuoteList[];
  aliases: Record<string, string>;
  userId: string;
  onClose: () => void;
}

export function MultiListInviteModal({
  visible,
  lists,
  aliases,
  userId,
  onClose,
}: MultiListInviteModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(new Set(lists.map((l) => l.id!)));
      setCopied(false);
    }
  }, [visible, lists]);

  function toggleList(listId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(listId)) {
        next.delete(listId);
      } else {
        next.add(listId);
      }
      return next;
    });
  }

  async function handleCreateLink() {
    if (selected.size === 0) return;
    setCreating(true);
    try {
      const selectedLists = lists.filter((l) => selected.has(l.id!));
      const listIds = selectedLists.map((l) => l.id!);
      const listNames = selectedLists.map((l) => aliases[l.id!] ?? l.personName);
      const inviteId = await createMultiListInvite(listIds, listNames, userId);
      const origin =
        Platform.OS === 'web'
          ? window.location.origin
          : 'https://quoth-4160d.web.app';
      const url = `${origin}/invite/${inviteId}`;
      if (Platform.OS === 'web' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        Alert.alert('Share link', url);
        onClose();
      }
    } catch (error) {
      console.error('Failed to create invite:', error);
      Alert.alert('Error', 'Failed to create invite link. Please try again.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>Create Invite Link</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Select which lists to include:
          </Text>

          <FlatList
            data={lists}
            keyExtractor={(item) => item.id!}
            style={styles.list}
            renderItem={({ item }) => {
              const isSelected = selected.has(item.id!);
              const alias = aliases[item.id!] ?? item.personName;
              return (
                <Pressable
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: isSelected ? colors.tint + '15' : 'transparent',
                      borderColor: isSelected ? colors.tint : colors.icon + '30',
                    },
                  ]}
                  onPress={() => toggleList(item.id!)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: isSelected ? colors.tint : colors.icon },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[
                          styles.checkboxInner,
                          { backgroundColor: colors.tint },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.listItemText}>
                    <Text style={[styles.listName, { color: colors.text }]}>
                      {alias}
                    </Text>
                    <Text style={[styles.listMeta, { color: colors.icon }]}>
                      {item.collaborators.length} collaborator
                      {item.collaborators.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </Pressable>
              );
            }}
          />

          {copied && (
            <Text style={[styles.copiedText, { color: colors.tint }]}>
              Link copied!
            </Text>
          )}

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.icon }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.createButton,
                {
                  backgroundColor: colors.tint,
                  opacity: selected.size === 0 || creating ? 0.5 : 1,
                },
              ]}
              onPress={handleCreateLink}
              disabled={selected.size === 0 || creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.createButtonText}>Create Link</Text>
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
    maxHeight: '70%',
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
  list: {
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxInner: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  listItemText: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: '500',
  },
  listMeta: {
    fontSize: 13,
    marginTop: 2,
  },
  copiedText: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
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
  createButton: {
    flex: 2,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
