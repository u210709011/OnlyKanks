import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { signOut } from '../../services/auth.service';
import { useAuth } from '../../context/auth.context';

const SettingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.profileSection}>
        <Text style={styles.displayName}>{user?.displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.settingsSection}>
        <Pressable 
          style={styles.button}
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
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  settingsSection: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
  },
  button: {
    backgroundColor: '#ff4444',
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
