import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { AppHeader } from '../../components/shared/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function NotificationsSettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    pushEnabled: true,
    eventReminders: true,
    friendRequests: true,
    messages: true,
    appUpdates: false,
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Notifications" />
      
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Push Notifications
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Enable or disable all notifications
              </Text>
            </View>
            <Switch
              value={settings.pushEnabled}
              onValueChange={() => toggleSetting('pushEnabled')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.pushEnabled ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Event Reminders
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Get notified about upcoming events
              </Text>
            </View>
            <Switch
              value={settings.eventReminders}
              onValueChange={() => toggleSetting('eventReminders')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.eventReminders ? theme.primary : '#f4f3f4'}
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Friend Requests
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Get notified about new friend requests
              </Text>
            </View>
            <Switch
              value={settings.friendRequests}
              onValueChange={() => toggleSetting('friendRequests')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.friendRequests ? theme.primary : '#f4f3f4'}
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Messages
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Get notified about new messages
              </Text>
            </View>
            <Switch
              value={settings.messages}
              onValueChange={() => toggleSetting('messages')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.messages ? theme.primary : '#f4f3f4'}
              disabled={!settings.pushEnabled}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                App Updates
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Get notified about app updates and new features
              </Text>
            </View>
            <Switch
              value={settings.appUpdates}
              onValueChange={() => toggleSetting('appUpdates')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.appUpdates ? theme.primary : '#f4f3f4'}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

        <Text style={[styles.disclaimer, { color: theme.text + '60' }]}>
          Changes to notification settings are saved automatically
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  section: {
    margin: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Roboto',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    paddingHorizontal: 24,
    fontFamily: 'Roboto',
  },
}); 