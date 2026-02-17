import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useUserLists } from '@/hooks/use-user-lists';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { buildExportData, downloadJson } from '@/services/export';

export default function SettingsScreen() {
  const { user, isAnonymous, linkGoogle } = useAuth();
  const { lists, aliases } = useUserLists();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exporting, setExporting] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [linking, setLinking] = useState(false);

  async function handleExport(options?: { listId?: string }) {
    if (!user) return;
    setExporting(true);
    setExportStatus('');
    try {
      const data = await buildExportData(user.uid, {
        ...options,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      const timestamp = new Date().toISOString().slice(0, 10);
      downloadJson(data, `quoth-export-${timestamp}.json`);
      setExportStatus(
        `Exported ${data.totalQuotes} quote${data.totalQuotes !== 1 ? 's' : ''} across ${data.totalLists} list${data.totalLists !== 1 ? 's' : ''}`,
      );
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  async function handleExportAll() {
    await handleExport();
  }

  async function handleExportList(listId: string) {
    await handleExport({ listId });
  }

  async function handleLinkGoogle() {
    setLinkError('');
    setLinking(true);
    try {
      await linkGoogle();
    } catch (error: any) {
      const code = error?.code;
      if (code === 'auth/credential-already-in-use') {
        setLinkError('This Google account is already linked to another user.');
      } else if (code === 'auth/popup-closed-by-user') {
        setLinkError('Sign-in popup was closed. Please try again.');
      } else {
        setLinkError('Failed to link account. Please try again.');
      }
    } finally {
      setLinking(false);
    }
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.container}
    >
      {/* Export Section */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Export Data
      </Text>

      <Pressable
        style={[styles.exportRow, { borderColor: colors.icon + '30' }]}
        onPress={handleExportAll}
        disabled={exporting}
      >
        <Text style={[styles.exportLabel, { color: colors.text }]}>
          Export all quotes
        </Text>
        <Ionicons name="download-outline" size={22} color={colors.tint} />
      </Pressable>

      {/* Date range */}
      <Text style={[styles.subLabel, { color: colors.icon }]}>
        Optional date range
      </Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[
            styles.dateInput,
            {
              color: colors.text,
              borderColor: colors.icon + '40',
              backgroundColor: colors.background,
            },
          ]}
          placeholder="From (YYYY-MM-DD)"
          placeholderTextColor={colors.icon + '80'}
          value={fromDate}
          onChangeText={setFromDate}
        />
        <TextInput
          style={[
            styles.dateInput,
            {
              color: colors.text,
              borderColor: colors.icon + '40',
              backgroundColor: colors.background,
            },
          ]}
          placeholder="To (YYYY-MM-DD)"
          placeholderTextColor={colors.icon + '80'}
          value={toDate}
          onChangeText={setToDate}
        />
      </View>

      {/* Per-list export */}
      {lists.length > 0 && (
        <>
          <Text style={[styles.subLabel, { color: colors.icon }]}>
            Export by list
          </Text>
          {lists.map((list) => (
            <Pressable
              key={list.id}
              style={[styles.exportRow, { borderColor: colors.icon + '30' }]}
              onPress={() => handleExportList(list.id!)}
              disabled={exporting}
            >
              <Text style={[styles.exportLabel, { color: colors.text }]}>
                {aliases[list.id!] ?? list.personName}
              </Text>
              <Ionicons
                name="download-outline"
                size={20}
                color={colors.tint}
              />
            </Pressable>
          ))}
        </>
      )}

      {exporting && (
        <ActivityIndicator
          size="small"
          color={colors.tint}
          style={styles.statusSpinner}
        />
      )}

      {exportStatus !== '' && (
        <Text style={[styles.statusText, { color: colors.tint }]}>
          {exportStatus}
        </Text>
      )}

      {/* Account Section */}
      <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>
        Account
      </Text>

      {isAnonymous ? (
        <View style={[styles.accountCard, { borderColor: colors.icon + '30' }]}>
          <Text style={[styles.accountInfo, { color: colors.icon }]}>
            Your account is anonymous. Link a Google account to protect your
            quotes if you clear browser data or switch devices.
          </Text>
          <Pressable
            style={[styles.linkButton, { backgroundColor: colors.tint }]}
            onPress={handleLinkGoogle}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="logo-google"
                  size={18}
                  color="#fff"
                  style={styles.linkIcon}
                />
                <Text style={styles.linkButtonText}>Link Google Account</Text>
              </>
            )}
          </Pressable>
          {linkError !== '' && (
            <Text style={styles.linkError}>{linkError}</Text>
          )}
        </View>
      ) : (
        <View style={[styles.accountCard, { borderColor: colors.icon + '30' }]}>
          <View style={styles.linkedRow}>
            <Ionicons
              name="checkmark-circle"
              size={22}
              color={colors.tint}
              style={styles.linkedIcon}
            />
            <Text style={[styles.linkedText, { color: colors.text }]}>
              Linked as: {user?.email}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  exportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 8,
  },
  exportLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  subLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 12,
    marginBottom: 8,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  statusSpinner: {
    marginTop: 12,
  },
  statusText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  accountCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
  },
  accountInfo: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
  },
  linkIcon: {
    marginRight: 8,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkError: {
    color: '#e74c3c',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkedIcon: {
    marginRight: 8,
  },
  linkedText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
