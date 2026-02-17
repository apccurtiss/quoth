import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  getInvite,
  addCollaborator,
  setListAlias,
  getUserListAliases,
  getUserLists,
} from '@/services/firestore';
import type { Invite } from '@/types';

export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [aliasConflict, setAliasConflict] = useState(false);
  const [customAlias, setCustomAlias] = useState('');
  const [alreadyMember, setAlreadyMember] = useState(false);

  const loadInvite = useCallback(async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const [fetchedInvite, existingAliases, userLists] = await Promise.all([
        getInvite(id),
        getUserListAliases(user.uid),
        getUserLists(user.uid),
      ]);

      setInvite(fetchedInvite);

      if (!fetchedInvite) return;

      // Check if already a collaborator by checking user's lists
      if (userLists.some((l) => l.id === fetchedInvite.listId)) {
        setAlreadyMember(true);
        return;
      }

      // Check for alias conflict
      const listName = fetchedInvite.listName.toLowerCase();
      const hasConflict = Object.values(existingAliases).some(
        (a) => a.toLowerCase() === listName,
      );
      setAliasConflict(hasConflict);
      setCustomAlias(fetchedInvite.listName);
    } catch (error) {
      console.error('Failed to load invite:', error);
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    loadInvite();
  }, [loadInvite]);

  async function handleJoin() {
    if (!invite || !user) return;
    setJoining(true);
    try {
      const alias = aliasConflict ? customAlias.trim() : invite.listName;
      await addCollaborator(invite.listId, user.uid);
      await setListAlias(user.uid, invite.listId, alias);
      router.replace({
        pathname: '/list/[id]',
        params: { id: invite.listId },
      });
    } catch (error) {
      console.error('Failed to join list:', error);
      setJoining(false);
    }
  }

  function handleGoToList() {
    if (!invite) return;
    router.replace({
      pathname: '/list/[id]',
      params: { id: invite.listId },
    });
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invite' }} />
        <View
          style={[styles.centered, { backgroundColor: colors.background }]}
        >
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </>
    );
  }

  if (!invite) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invite' }} />
        <View
          style={[styles.centered, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.errorText, { color: colors.icon }]}>
            This invite link is invalid or the list no longer exists.
          </Text>
        </View>
      </>
    );
  }

  if (alreadyMember) {
    return (
      <>
        <Stack.Screen options={{ title: 'Invite' }} />
        <View
          style={[styles.centered, { backgroundColor: colors.background }]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            You're already a member
          </Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            You're already collaborating on "{invite.listName}".
          </Text>
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={handleGoToList}
          >
            <Text style={styles.buttonText}>Go to list</Text>
          </Pressable>
        </View>
      </>
    );
  }

  const canJoin =
    !joining && (!aliasConflict || customAlias.trim().length > 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Invite' }} />
      <View
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
        <View style={styles.card}>
          <Text style={[styles.title, { color: colors.text }]}>
            You've been invited!
          </Text>
          <Text style={[styles.listName, { color: colors.text }]}>
            {invite.listName}
          </Text>

          {aliasConflict && (
            <View style={styles.conflictSection}>
              <Text style={[styles.conflictText, { color: colors.icon }]}>
                You already have a list named "{invite.listName}". Choose a
                different name for this list:
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.icon + '40',
                    backgroundColor: colors.background,
                  },
                ]}
                value={customAlias}
                onChangeText={setCustomAlias}
                autoCapitalize="words"
                placeholder="e.g. Mike (Work)"
                placeholderTextColor={colors.icon + '80'}
              />
            </View>
          )}

          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: colors.tint,
                opacity: canJoin ? 1 : 0.5,
              },
            ]}
            onPress={handleJoin}
            disabled={!canJoin}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Join list</Text>
            )}
          </Pressable>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 16,
  },
  listName: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  conflictSection: {
    width: '100%',
    marginBottom: 16,
  },
  conflictText: {
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    width: '100%',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 160,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
