import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Event } from '../../services/events.service';

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (auth.currentUser) {
        // Set display name and photo from auth
        setDisplayName(auth.currentUser.displayName || 'User');
        setProfileImage(auth.currentUser.photoURL);
        
        // Get additional user data from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserBio(userData.bio || '');
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
        
        // Fetch user's events
        try {
          const eventsQuery = query(
            collection(db, 'events'),
            where('createdBy', '==', auth.currentUser.uid)
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
      }
      setLoading(false);
    };
    
    fetchUserProfile();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with settings button */}
      <View style={[styles.header, { 
        backgroundColor: theme.background,
        paddingTop: insets.top,
        borderBottomColor: theme.border 
      }]}>
        <Text style={[styles.username, { color: theme.text }]}>
          {displayName}
        </Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView
        contentContainerStyle={{ 
          paddingBottom: insets.bottom + 72
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
          
          <Text style={[styles.bio, { color: theme.text }]}>
            {userBio || 'No bio yet. Edit your profile to add one.'}
          </Text>
          
          <TouchableOpacity 
            style={[styles.editProfileButton, { borderColor: theme.border }]}
            onPress={() => router.push('/edit-profile')}
          >
            <Text style={[styles.editProfileText, { color: theme.text }]}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
        
        {/* Messages Button */}
        <TouchableOpacity
          style={[styles.messagesButton, { backgroundColor: theme.card }]}
          onPress={() => router.push('/messages')}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={theme.text} />
          <Text style={[styles.messagesText, { color: theme.text }]}>Messages</Text>
        </TouchableOpacity>
        
        {/* Friends Button */}
        <TouchableOpacity
          style={[styles.messagesButton, { backgroundColor: theme.card }]}
          onPress={() => router.push('/friends')}
        >
          <Ionicons name="people-outline" size={20} color={theme.text} />
          <Text style={[styles.messagesText, { color: theme.text }]}>Friends</Text>
        </TouchableOpacity>
        
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
                Create your first event to see it here
              </Text>
              <TouchableOpacity 
                style={[styles.createEventButton, { backgroundColor: theme.primary }]}
                onPress={() => router.push('/(tabs)/create-event')}
              >
                <Text style={styles.createEventText}>Create Event</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.eventsGrid}>
              {userEvents.map(event => (
                <Pressable 
                  key={event.id} 
                  style={styles.eventItem}
                  onPress={() => router.push(`/event/${event.id}`)}
                >
                  <Image 
                    source={
                      event.imageUrl 
                        ? { uri: event.imageUrl } 
                        : require('../../assets/event-placeholder.png')
                    } 
                    style={styles.eventImage}
                  />
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
  bio: {
    fontSize: 14,
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  editProfileButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 8,
    alignItems: 'center',
  },
  editProfileText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  messagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  messagesText: {
    marginLeft: 8,
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 16,
  },
  tabButton: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  eventsContainer: {
    padding: 8,
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  eventItem: {
    width: '33.33%',
    padding: 2,
  },
  eventImage: {
    width: '100%',
    height: 120,
    borderRadius: 4,
  },
  eventTitle: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: 'Roboto',
  },
  emptyEventsContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  createEventButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createEventText: {
    color: 'white',
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
}); 