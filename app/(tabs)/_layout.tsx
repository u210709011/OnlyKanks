import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { StyleSheet, View, Image } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../../config/firebase';
import { useState, useEffect } from 'react';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Get user profile image
  useEffect(() => {
    if (auth.currentUser?.photoURL) {
      console.log("setting profile image", auth.currentUser.photoURL);
      setProfileImage(auth.currentUser.photoURL);
    }
  }, []);

  return (
    <Tabs 
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderTopWidth: 0,
          elevation: 4,
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 17,
          marginTop: 0,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.text + '70',
        tabBarShowLabel: false,
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 0,
        },
        headerTitleStyle: {
          fontFamily: 'Roboto',
          fontWeight: 'bold',
          fontSize: 18,
        },
        headerTintColor: theme.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: color + '20' }]}>
              <Ionicons name={focused ? "compass" : "compass-outline"} size={28} color={color} />
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create-event"
        options={{
          tabBarIcon: ({ color }) => (
            <View style={[styles.createButton, { backgroundColor: theme.primary }]}>
              <Ionicons name="add" size={32} color="#fff" />
            </View>
          ),
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: color + '20' }]}>
              {profileImage ? (
                <Image 
                  source={{ uri: profileImage }} 
                  style={[
                    styles.profileImage,
                    focused && { borderColor: color, borderWidth: 2 }
                  ]} 
                />
              ) : (
                <Ionicons name={focused ? "person" : "person-outline"} size={28} color={color} />
              )}
            </View>
          ),
          headerShown: false,
        }}
      />
      
      {/* Hidden tabs - we don't want these in the tab bar */}
      <Tabs.Screen
        name="friends"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="event-requests"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
