import { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { getUserLists, getUserNicknames, getUserListAliases } from '@/services/firestore';
import { FriendDetailModal } from '@/components/friend-detail-modal';
import { MultiListInviteModal } from '@/components/multi-list-invite-modal';
import type { QuoteList } from '@/types';

interface Friend {
  uid: string;
  name: string;
  listCount: number;
}

export default function SharingScreen() {
  const { user, autoShareWith } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [friends, setFriends] = useState<Friend[]>([]);
  const [lists, setLists] = useState<QuoteList[]>([]);
  const [aliases, setAliases] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [userLists, userAliases] = await Promise.all([
        getUserLists(user.uid),
        getUserListAliases(user.uid),
      ]);
      setLists(userLists);
      setAliases(userAliases);

      // Flatten collaborators, deduplicate, remove own UID
      const allCollaborators = userLists.flatMap((l) => l.collaborators);
      const friendUids = [...new Set(allCollaborators)].filter(
        (uid) => uid !== user.uid,
      );

      if (friendUids.length === 0) {
        setFriends([]);
        return;
      }

      const nicknames = await getUserNicknames(friendUids);

      // Count how many lists each friend is on
      const listCountByUid: Record<string, number> = {};
      for (const list of userLists) {
        for (const collab of list.collaborators) {
          if (collab !== user.uid) {
            listCountByUid[collab] = (listCountByUid[collab] ?? 0) + 1;
          }
        }
      }

      const friendList: Friend[] = friendUids.map((uid) => ({
        uid,
        name: nicknames[uid] || 'Anonymous user',
        listCount: listCountByUid[uid] ?? 0,
      }));
      friendList.sort((a, b) => a.name.localeCompare(b.name));
      setFriends(friendList);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Create Invite Link button */}
      <Pressable
        style={[styles.inviteButton, { backgroundColor: colors.tint }]}
        onPress={() => setShowInviteModal(true)}
      >
        <Text style={styles.inviteButtonText}>Create Invite Link</Text>
      </Pressable>

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.tint}
          style={styles.spinner}
        />
      ) : friends.length === 0 ? (
        <View style={styles.centered}>
          <Text style={[styles.emptyText, { color: colors.icon }]}>
            No collaborators yet. Share a list to get started.
          </Text>
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item) => item.uid}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { borderColor: colors.icon + '20' }]}
              onPress={() => setSelectedFriend(item)}
            >
              <Text style={[styles.friendName, { color: colors.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.friendMeta, { color: colors.icon }]}>
                {item.listCount} shared list{item.listCount !== 1 ? 's' : ''}
              </Text>
            </Pressable>
          )}
        />
      )}

      {selectedFriend && (
        <FriendDetailModal
          visible={selectedFriend !== null}
          friendUid={selectedFriend.uid}
          friendName={selectedFriend.name}
          lists={lists}
          aliases={aliases}
          autoShareWith={autoShareWith}
          currentUserId={user?.uid ?? ''}
          onClose={() => setSelectedFriend(null)}
          onRefresh={loadData}
        />
      )}

      <MultiListInviteModal
        visible={showInviteModal}
        lists={lists}
        aliases={aliases}
        userId={user?.uid ?? ''}
        onClose={() => setShowInviteModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  inviteButton: {
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  spinner: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  friendMeta: {
    fontSize: 13,
  },
});
