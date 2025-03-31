import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '../../components/shared/AppHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const openLink = (url: string) => {
    Linking.openURL(url).catch(err => console.error('An error occurred', err));
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader title="About" />
      
      <ScrollView 
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, { color: theme.text }]}>OnlyKanks</Text>
          <Text style={[styles.version, { color: theme.text + '80' }]}>Version 1.0.0</Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>About OnlyKanks</Text>
          <Text style={[styles.description, { color: theme.text }]}>
            OnlyKanks is a social app designed to help you discover and connect with friends and events around you. 
            Create your profile, share your interests, and join events that match your preferences.
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Contact Us</Text>
          
          <TouchableOpacity 
            style={[styles.linkItem, { borderBottomColor: theme.border }]}
            onPress={() => openLink('mailto:support@onlykanks.com')}
          >
            <Ionicons name="mail-outline" size={22} color={theme.text} />
            <Text style={[styles.linkText, { color: theme.text }]}>support@onlykanks.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.linkItem, { borderBottomColor: theme.border }]}
            onPress={() => openLink('https://onlykanks.com')}
          >
            <Ionicons name="globe-outline" size={22} color={theme.text} />
            <Text style={[styles.linkText, { color: theme.text }]}>onlykanks.com</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => openLink('https://twitter.com/onlykanks')}
          >
            <Ionicons name="logo-twitter" size={22} color={theme.text} />
            <Text style={[styles.linkText, { color: theme.text }]}>@onlykanks</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.primary }]}>Legal</Text>
          
          <TouchableOpacity 
            style={[styles.linkItem, { borderBottomColor: theme.border }]}
            onPress={() => openLink('https://onlykanks.com/terms')}
          >
            <Ionicons name="document-text-outline" size={22} color={theme.text} />
            <Text style={[styles.linkText, { color: theme.text }]}>Terms of Service</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.linkItem}
            onPress={() => openLink('https://onlykanks.com/privacy')}
          >
            <Ionicons name="shield-outline" size={22} color={theme.text} />
            <Text style={[styles.linkText, { color: theme.text }]}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.copyright, { color: theme.text + '60' }]}>
          © 2023 OnlyKanks. All rights reserved.
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
  logoContainer: {
    alignItems: 'center',
    padding: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  version: {
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  section: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'Roboto',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Roboto',
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  linkText: {
    fontSize: 16,
    marginLeft: 12,
    fontFamily: 'Roboto',
  },
  copyright: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
    fontFamily: 'Roboto',
  },
}); 