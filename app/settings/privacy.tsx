import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../components/shared/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState({
    profileVisibility: 'public', // public, friends, private
    locationSharing: true,
    activityStatus: true,
    readReceipts: true,
  });

  const toggleSetting = (key: 'locationSharing' | 'activityStatus' | 'readReceipts') => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const setProfileVisibility = (value: string) => {
    setSettings(prev => ({
      ...prev,
      profileVisibility: value
    }));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title="Privacy" />
      
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Profile Visibility
            </Text>
          </View>

          <TouchableOpacity 
            style={[
              styles.visibilityOption, 
              { borderBottomColor: theme.border }
            ]}
            onPress={() => setProfileVisibility('public')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="globe-outline" size={22} color={theme.text} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Public</Text>
                <Text style={[styles.optionDescription, { color: theme.text + '80' }]}>
                  Anyone can see your profile
                </Text>
              </View>
            </View>
            {settings.profileVisibility === 'public' && (
              <Ionicons name="checkmark" size={22} color={theme.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.visibilityOption, 
              { borderBottomColor: theme.border }
            ]}
            onPress={() => setProfileVisibility('friends')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="people-outline" size={22} color={theme.text} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Friends Only</Text>
                <Text style={[styles.optionDescription, { color: theme.text + '80' }]}>
                  Only your friends can see your profile
                </Text>
              </View>
            </View>
            {settings.profileVisibility === 'friends' && (
              <Ionicons name="checkmark" size={22} color={theme.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.visibilityOption}
            onPress={() => setProfileVisibility('private')}
          >
            <View style={styles.optionContent}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.text} />
              <View style={styles.optionTextContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Private</Text>
                <Text style={[styles.optionDescription, { color: theme.text + '80' }]}>
                  Nobody can see your profile
                </Text>
              </View>
            </View>
            {settings.profileVisibility === 'private' && (
              <Ionicons name="checkmark" size={22} color={theme.primary} />
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Sharing Settings
            </Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Location Sharing
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Allow the app to access your location
              </Text>
            </View>
            <Switch
              value={settings.locationSharing}
              onValueChange={() => toggleSetting('locationSharing')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.locationSharing ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Activity Status
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Show others when you're online
              </Text>
            </View>
            <Switch
              value={settings.activityStatus}
              onValueChange={() => toggleSetting('activityStatus')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.activityStatus ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Read Receipts
              </Text>
              <Text style={[styles.settingDescription, { color: theme.text + '80' }]}>
                Let others know when you've read their messages
              </Text>
            </View>
            <Switch
              value={settings.readReceipts}
              onValueChange={() => toggleSetting('readReceipts')}
              trackColor={{ false: theme.border, true: theme.primary + '80' }}
              thumbColor={settings.readReceipts ? theme.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.blockButton, { backgroundColor: theme.card }]}>
          <Text style={[styles.blockButtonText, { color: '#FF3B30' }]}>
            Blocked Users
          </Text>
          <Ionicons name="chevron-forward" size={20} color={theme.text + '80'} />
        </TouchableOpacity>

        <Text style={[styles.disclaimer, { color: theme.text + '60' }]}>
          Privacy settings are saved automatically
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
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sectionHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  visibilityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionTextContainer: {
    marginLeft: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  optionDescription: {
    fontSize: 13,
    fontFamily: 'Roboto',
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
  blockButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 10,
  },
  blockButtonText: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 24,
    fontFamily: 'Roboto',
  },
}); 