import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../context/theme.context';

export default function NotificationTestButton() {
  const { theme } = useTheme();
  
  const showNotificationInfo = () => {
    Alert.alert(
      "Notifications in Expo Go",
      "Push notifications are not supported in Expo Go. To use push notifications, you would need to create a development build. In-app notifications are still working.",
      [{ text: "OK" }]
    );
  };
  
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: theme.primary }]}
      onPress={showNotificationInfo}
    >
      <Text style={styles.buttonText}>About Notifications</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto'
  },
}); 