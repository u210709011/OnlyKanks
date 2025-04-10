import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth.context';
import { useTheme } from '../../context/theme.context';
import { auth } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from '../../services/auth.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const unstable_settings = {
  href: null,
};

type SettingItem = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  right?: string;
  color?: string;
};

const SettingsScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    try {
      Alert.alert(
        "Sign Out",
        "Are you sure you want to sign out?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Sign Out", 
            style: "destructive",
            onPress: async () => {
              await signOut();
              router.replace('/sign-in');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const accountSettings: SettingItem[] = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      onPress: () => router.push('/profile/edit'),
    },
    {
      icon: 'people-outline',
      title: 'Friends',
      subtitle: 'Manage your friends and requests',
      onPress: () => router.push('/friends'),
    },
    {
      icon: 'people-outline',
      title: 'Event Requests',
      subtitle: 'Manage requests to join your events',
      onPress: () => router.push('/event-requests'),
    },
    {
      icon: 'mail-outline',
      title: 'Event Invitations',
      subtitle: 'Manage event invitations',
      onPress: () => router.push('/settings/invitations'),
    }
  ];

  const appSettings: SettingItem[] = [
    {
      icon: isDark ? 'sunny-outline' : 'moon-outline',
      title: 'Theme',
      subtitle: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      onPress: toggleTheme,
      right: isDark ? 'Dark' : 'Light',
    },
    {
      icon: 'notifications-outline',
      title: 'Notifications',
      subtitle: 'Manage your notification preferences',
      onPress: () => router.push('/settings/notifications'),
    },
    {
      icon: 'lock-closed-outline',
      title: 'Privacy',
      subtitle: 'Manage your privacy settings',
      onPress: () => router.push('/settings/privacy'),
    }
  ];

  const supportSettings: SettingItem[] = [
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help or contact support',
      onPress: () => router.push('/settings/help'),
    },
    {
      icon: 'information-circle-outline',
      title: 'About',
      subtitle: 'App version and information',
      onPress: () => router.push('/settings/about'),
    },
    {
      icon: 'log-out-outline',
      title: 'Sign Out',
      onPress: handleSignOut,
      color: '#FF3B30',
    }
  ];

  const renderSettingItem = (item: SettingItem, index: number, isLast: boolean) => (
    <TouchableOpacity
      key={index}
      style={[
        styles.settingItem,
        !isLast && styles.settingItemBorder,
        { borderBottomColor: theme.border }
      ]}
      onPress={item.onPress}
    >
      <View style={[styles.settingIconContainer, { backgroundColor: theme.background + '30' }]}>
        <Ionicons 
          name={item.icon as any} 
          size={20} 
          color={item.color || theme.primary} 
        />
      </View>
      
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: item.color || theme.text }]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={[styles.settingSubtitle, { color: theme.text + '80' }]}>
            {item.subtitle}
          </Text>
        )}
      </View>
      
      <View style={styles.settingRight}>
        {item.right && (
          <Text style={[styles.settingRightText, { color: theme.text + '80' }]}>
            {item.right}
          </Text>
        )}
        <Ionicons name="chevron-forward" size={18} color={theme.text + '60'} />
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.sectionContainer}>
      <Text style={[styles.sectionTitle, { color: theme.primary }]}>{title}</Text>
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        {items.map((item, index) => renderSettingItem(item, index, index === items.length - 1))}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <View style={{ height: insets.top, backgroundColor: theme.background }} />
      
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {renderSection('ACCOUNT', accountSettings)}
        {renderSection('APP SETTINGS', appSettings)}
        {renderSection('SUPPORT', supportSettings)}
        
        <Text style={[styles.versionText, { color: theme.text + '60' }]}>
          Version 1.0.0
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 12,
    fontFamily: 'Roboto',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 0.5,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Roboto',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingRightText: {
    marginRight: 8,
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginVertical: 24,
    fontFamily: 'Roboto',
  }
});

export default SettingsScreen;


