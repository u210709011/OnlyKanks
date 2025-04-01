import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Event } from '../../services/events.service';
import { MessagesService } from '../../services/messages.service';
import { FriendsService, FriendRequestStatus } from '../../services/friends.service';
import { User, UserService } from '../../services/user.service';
import { CustomButton } from '../../components/shared/CustomButton';

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  
  const [displayName, setDisplayName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'sent' | 'received' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>(undefined);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  
  const userId = id as string;

  // Redirect to the profile tab if viewing your own profile
  useEffect(() => {
    if (auth.currentUser && userId === auth.currentUser.uid) {
      router.replace('/(tabs)/profile');
    }
  }, [userId]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        if (!userId) {
          setError('User not found');
          setLoading(false);
          return;
        }
        
        // Get user data
        const userData = await UserService.getUser(userId);
        if (userData) {
          setUser(userData);
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
            where('createdBy', '==', userId)
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
        
        // Fetch friendship status if viewing someone else's profile
        if (auth.currentUser) {
          const status = await FriendsService.getFriendRequestStatus(userId);
          setFriendshipStatus(status.status);
          setFriendRequestId(status.requestId);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [userId]);

  const handleMessage = async () => {
    if (!auth.currentUser) return;
    
    try {
      // Create or get a chat and navigate to it
      const chatId = await MessagesService.createOrGetChat(userId);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };
  
  const handleSendFriendRequest = async () => {
    if (!auth.currentUser) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.sendFriendRequest(userId);
      setFriendshipStatus('sent');
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setFriendActionLoading(false);
    }
  };
  
  const handleCancelFriendRequest = async () => {
    if (!friendRequestId) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.cancelFriendRequest(friendRequestId);
      setFriendshipStatus('none');
      setFriendRequestId(undefined);
    } catch (error) {
      console.error('Error canceling friend request:', error);
    } finally {
      setFriendActionLoading(false);
    }
  };
  
  const handleAcceptFriendRequest = async () => {
    if (!friendRequestId) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.respondToFriendRequest(friendRequestId, FriendRequestStatus.ACCEPTED);
      setFriendshipStatus('friends');
      setFriendRequestId(undefined);
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setFriendActionLoading(false);
    }
  };
  
  const handleRejectFriendRequest = async () => {
    if (!friendRequestId) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.respondToFriendRequest(friendRequestId, FriendRequestStatus.REJECTED);
      setFriendshipStatus('none');
      setFriendRequestId(undefined);
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setFriendActionLoading(false);
    }
  };
  
  const handleRemoveFriend = async () => {
    if (!userId) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.removeFriend(userId);
      setFriendshipStatus('none');
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setFriendActionLoading(false);
    }
  };

  // Show empty header while loading to prevent showing [id]
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator style={{ marginTop: insets.top + 50 }} size="large" color={theme.primary} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text, marginTop: insets.top + 50 }]}>
          {error || 'User not found'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={{ 
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 20
        }}
      >
        {/* Profile section */}
        <View style={styles.profileSection}>
          {/* Back button at the top */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

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
          
          <Text style={[styles.displayName, { color: theme.text }]}>{displayName}</Text>
          
          <Text style={[styles.bio, { color: theme.text }]}>
            {userBio || 'No bio yet.'}
          </Text>
          
          <View style={styles.actionButtons}>
            {/* Friend Request Buttons based on status */}
            {friendshipStatus === 'none' && (
              <CustomButton
                title="Add Friend"
                onPress={handleSendFriendRequest}
                loading={friendActionLoading}
                style={styles.actionButton}
              />
            )}
            
            {friendshipStatus === 'sent' && (
              <CustomButton
                title="Cancel Request"
                onPress={handleCancelFriendRequest}
                loading={friendActionLoading}
                style={styles.actionButton}
                secondary
              />
            )}
            
            {friendshipStatus === 'received' && (
              <View style={styles.rowButtons}>
                <CustomButton
                  title="Accept"
                  onPress={handleAcceptFriendRequest}
                  loading={friendActionLoading}
                  style={[styles.actionButton, styles.halfButton]}
                />
                <CustomButton
                  title="Decline"
                  onPress={handleRejectFriendRequest}
                  loading={friendActionLoading}
                  style={[styles.actionButton, styles.halfButton]}
                  secondary
                />
              </View>
            )}
            
            {friendshipStatus === 'friends' && (
              <CustomButton
                title="Friends"
                onPress={handleRemoveFriend}
                loading={friendActionLoading}
                style={styles.actionButton}
                secondary
              />
            )}
            
            {/* Message button */}
            <TouchableOpacity
              style={[styles.messageButton, { backgroundColor: theme.primary + '20' }]}
              onPress={handleMessage}
            >
              <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
              <Text style={[styles.messageButtonText, { color: theme.primary }]}>Message</Text>
            </TouchableOpacity>
          </View>
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
                This user has not created any events yet
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    lineHeight: 20,
    marginBottom: 16,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
}); 