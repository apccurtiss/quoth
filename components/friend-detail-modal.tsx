import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { addCollaborator, removeCollaborator } from '@/services/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { QuoteList } from '@/types';

interface FriendDetailModalProps {
  visible: boolean;
  friendUid: string | null;
  friendName: string;
  lists: QuoteList[];
  aliases: Record<string, string>;
  autoShareWith: string[];
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
}

export function FriendDetailModal({
  visible,
  friendUid,
  friendName,
  lists,
  aliases,
  autoShareWith,
  currentUserId,
  onClose,
  onRefresh,
}: FriendDetailModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { addAutoShareFriend, removeAutoShareFriend } = useAuth();
  const [busyListIds, setBusyListIds] = useState<Set<string>>(new Set());

  const isAutoShare = friendUid ? autoShareWith.includes(friendUid) : false;

  async function handleAutoShareToggle(value: boolean) {
    if (!friendUid) return;
    if (value) {
      await addAutoShareFriend(friendUid);
    } else {
      await removeAutoShareFriend(friendUid);
    }
  }

  async function handleListToggle(list: QuoteList) {
    if (!friendUid || !list.id) return;
    if (list.createdBy !== currentUserId) return;

    const isCollab = list.collaborators.includes(friendUid);
    setBusyListIds((prev) => new Set(prev).add(list.id!));
    try {
      if (isCollab) {
        await removeCollaborator(list.id, friendUid);
      } else {
        await addCollaborator(list.id, friendUid);
      }
      onRefresh();
    } finally {
      setBusyListIds((prev) => {
        const next = new Set(prev);
        next.delete(list.id!);
        return next;
      });
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <Text style={[styles.title, { color: colors.text }]}>{friendName}</Text>

          {/* Auto-share toggle */}
          <View style={[styles.autoShareRow, { borderColor: colors.icon + '30' }]}>
            <Text style={[styles.autoShareLabel, { color: colors.text }]}>
              Auto-share new lists
            </Text>
            <Switch
              value={isAutoShare}
              onValueChange={handleAutoShareToggle}
              trackColor={{ true: colors.tint }}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.icon }]}>Lists</Text>

          <FlatList
            data={lists}
            keyExtractor={(item) => item.id!}
            style={styles.list}
            renderItem={({ item }) => {
              if (!friendUid) return null;
              const isCollab = item.collaborators.includes(friendUid);
              const isOwner = item.createdBy === currentUserId;
              const isBusy = busyListIds.has(item.id!);
              const alias = aliases[item.id!] ?? item.personName;
              const dimmed = !isCollab && !isOwner;

              return (
                <Pressable
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: isCollab ? colors.tint + '15' : 'transparent',
                      borderColor: isCollab ? colors.tint : colors.icon + '30',
                      opacity: dimmed ? 0.4 : 1,
                    },
                  ]}
                  onPress={() => !dimmed && handleListToggle(item)}
                  disabled={dimmed || isBusy}
                >
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: isCollab ? colors.tint : colors.icon },
                    ]}
                  >
                    {isCollab && (
                      <View
                        style={[
                          styles.checkboxInner,
                          { backgroundColor: colors.tint },
                        ]}
                      />
                    )}
                  </View>
                  <Text style={[styles.listName, { color: colors.text, flex: 1 }]}>
                    {alias}
                  </Text>
                  {isBusy && (
                    <ActivityIndicator size="small" color={colors.tint} />
                  )}
                </Pressable>
              );
            }}
          />

          <Pressable
            style={[styles.closeButton, { backgroundColor: colors.tint }]}
            onPress={onClose}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
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
    maxHeight: '80%',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  autoShareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  autoShareLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
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
  listName: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
