import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from '../../services/auth.service';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';

const SettingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.profileSection, { backgroundColor: theme.card }]}>
        <Text style={[styles.displayName, { color: theme.text }]}>{user?.displayName}</Text>
        <Text style={[styles.email, { color: theme.text }]}>{user?.email}</Text>
      </View>

      <View style={[styles.settingsSection, { backgroundColor: theme.card }]}>
        <View style={styles.settingRow}>
          <Text style={[styles.settingText, { color: theme.text }]}>Dark Mode</Text>
          <Switch value={isDark} onValueChange={toggleTheme} />
        </View>
        
        <Pressable 
          style={[styles.button, { backgroundColor: theme.error }]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  settingsSection: {
    borderRadius: 8,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingText: {
    fontSize: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    opacity: 0.7,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SettingsScreen;

