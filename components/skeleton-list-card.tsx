import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export function SkeletonListCard() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800 }),
      -1,
      true,
    );
  }, [opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const barColor = colors.icon + '20';

  return (
    <View style={[styles.card, { borderColor: colors.icon + '20' }]}>
      <Animated.View
        style={[styles.titleBar, { backgroundColor: barColor }, animStyle]}
      />
      <Animated.View
        style={[styles.metaBar, { backgroundColor: barColor }, animStyle]}
      />
      <Animated.View
        style={[styles.previewBar, { backgroundColor: barColor }, animStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  titleBar: {
    height: 20,
    width: '60%',
    borderRadius: 4,
    marginBottom: 8,
  },
  metaBar: {
    height: 14,
    width: '40%',
    borderRadius: 4,
    marginBottom: 8,
  },
  previewBar: {
    height: 14,
    width: '80%',
    borderRadius: 4,
  },
});
