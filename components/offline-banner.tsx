import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function OfflineBanner() {
  const online = useOnlineStatus();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  if (online) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.warning + '20' }]}>
      <Ionicons name="cloud-offline-outline" size={18} color={colors.warning} />
      <Text style={[styles.text, { color: colors.text }]}>
        You're offline — changes will sync when reconnected
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
});
