import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Event } from '../../services/events.service';
import { UserService } from '../../services/user.service';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 24,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  editButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  actionButtons: {
    marginTop: 8,
  },
  actionButton: {
    marginVertical: 8,
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  messageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  messagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  messagesText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#5C6BC0',
  },
  eventsContainer: {
    padding: 16,
  },
  emptyEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEventsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  emptyEventsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    fontFamily: 'Roboto',
  },
  createEventButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createEventText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    padding: 8,
    fontFamily: 'Roboto',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
    fontFamily: 'Roboto',
  },
});

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  const [displayName, setDisplayName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Determine if this is for the current user
  const currentUserId = auth.currentUser?.uid;
  const paramId = params.id as string | undefined;

  // If an ID is provided in the params and it's not the current user, redirect to the profile page
  useEffect(() => {
    if (paramId && paramId !== currentUserId) {
      router.replace(`/profile/${paramId}`);
    }
  }, [paramId, currentUserId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!currentUserId) {
          setError('User not logged in');
          setLoading(false);
          return;
        }
        
        // Get user data
        const userData = await UserService.getUser(currentUserId);
        if (userData) {
          setDisplayName(userData.displayName || 'User');
          setProfileImage(userData.photoURL || null);
          setUserBio(userData.bio || '');
        } else {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        // Fetch user's events
        try {
          const eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', currentUserId)
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          const eventsData = eventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Event));
          setUserEvents(eventsData);
        } catch (error) {
          console.error('Error fetching user events:', error);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [currentUserId]);
  
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with profile title and settings button */}
      <View style={[styles.header, { 
        paddingTop: insets.top,
        backgroundColor: theme.background,
        borderBottomColor: theme.border,
        borderBottomWidth: 1
      }]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.username, { color: theme.text }]}>{auth.currentUser?.displayName}</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 20
        }}
      >
        {/* Profile section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <Image 
              source={profileImage ? { uri: profileImage } : require('../../assets/default-avatar.png')} 
              style={styles.profileImage}
            />
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>142</Text>
                <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: theme.text }]}>38</Text>
                <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Attending</Text>
              </View>
            </View>
          </View>
          
          <Text style={[styles.displayName, { color: theme.text }]}>
            {displayName}
          </Text>
          
          <Text style={[styles.bio, { color: theme.text }]}>
            {userBio || 'No bio yet.'}
          </Text>
          
          <TouchableOpacity
            style={[styles.editButton, { borderColor: theme.border }]}
            onPress={handleEditProfile}
          >
            <Text style={[styles.editButtonText, { color: theme.text }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tabs for Events */}
        <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
          <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
            <Ionicons name="calendar" size={24} color={theme.primary} />
          </TouchableOpacity>
        </View>
        
        {/* Events Grid/List */}
        <View style={styles.eventsContainer}>
          {userEvents.length === 0 ? (
            <View style={styles.emptyEventsContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="calendar-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyEventsText, { color: theme.text }]}>No events yet</Text>
              <Text style={[styles.emptyEventsSubtext, { color: theme.text + '80' }]}>
                Create your first event by tapping the "+" button on the home tab
              </Text>
            </View>
          ) : (
            <View style={styles.eventsGrid}>
              {userEvents.map(event => (
                <Pressable 
                  key={event.id} 
                  style={styles.eventItem}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  {event.imageUrl ? (
                    <Image 
                      source={{ uri: event.imageUrl }} 
                      style={styles.eventImage}
                    />
                  ) : (
                    <View style={[styles.eventImagePlaceholder, { backgroundColor: theme.card }]}>
                      <Ionicons name="calendar-outline" size={32} color={theme.primary} />
                    </View>
                  )}
                  <Text 
                    style={[styles.eventTitle, { color: theme.text }]} 
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
} 