import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useTheme } from '../../context/theme.context';

export default function ProfileIndex() {
  const router = useRouter();
  const { theme } = useTheme();

  useEffect(() => {
    // Redirect to the profile tab when this route is accessed directly
    router.replace('/(tabs)/profile');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.background }}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
} 