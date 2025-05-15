import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { StyleSheet, View, Image, Text } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../config/firebase';
import { useState, useEffect } from 'react';
import { collections } from '../../services/firebase.service';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function TabLayout() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Get user profile image
  useEffect(() => {
    if (auth.currentUser?.photoURL) {
      console.log("setting profile image", auth.currentUser.photoURL);
      setProfileImage(auth.currentUser.photoURL);
    }
  }, []);

  // Subscribe to unread notifications
  useEffect(() => {
    if (!auth.currentUser) return;

    const notificationsRef = collection(db, collections.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.docs.length);
    });

    return () => unsubscribe();
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
      {/* Explore Tab */}
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
      
      {/* Search Tab */}
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: color + '20' }]}>
              <Ionicons name={focused ? "search" : "search-outline"} size={28} color={color} />
            </View>
          ),
          headerShown: false,
        }}
      />
      
      {/* Create Event Tab */}
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
      
      {/* Notifications Tab */}
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.iconContainer, focused && { backgroundColor: color + '20' }]}>
              <Ionicons name={focused ? "notifications" : "notifications-outline"} size={28} color={color} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          ),
          headerShown: false,
        }}
      />
      
      {/* Profile Tab */}
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
  badge: {
    position: 'absolute',
    right: 0,
    top: 8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
