import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { User, UserService } from '../../services/user.service';
import { Event } from '../../services/events.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { EventCard } from '../../components/events/EventCard';
import { auth } from '../../config/firebase';
import { MessagesService } from '../../services/messages.service';
import { CustomButton } from '../../components/shared/CustomButton';
import { FriendsService, FriendRequestStatus } from '../../services/friends.service';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'sent' | 'received' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>(undefined);
  const [friendActionLoading, setFriendActionLoading] = useState(false);

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      try {
        // Fetch user profile
        const userData = await UserService.getUser(id as string);
        if (userData) {
          setUser(userData);
          
          // Fetch user's events
          const eventsRef = collection(db, 'events');
          const q = query(eventsRef, where('createdBy', '==', id));
          const querySnapshot = await getDocs(q);
          const events = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Event[];
          setUserEvents(events);
          
          // Fetch friendship status
          if (auth.currentUser && auth.currentUser.uid !== id) {
            const status = await FriendsService.getFriendRequestStatus(id as string);
            setFriendshipStatus(status.status);
            setFriendRequestId(status.requestId);
          }
        } else {
          setError('User not found');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndEvents();
  }, [id]);

  const handleMessage = async () => {
    if (!auth.currentUser || auth.currentUser.uid === id) return;
    
    try {
      // Create or get a chat and navigate to it
      const chatId = await MessagesService.createOrGetChat(id as string);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to start chat');
    }
  };
  
  const handleSendFriendRequest = async () => {
    if (!auth.currentUser || auth.currentUser.uid === id) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.sendFriendRequest(id as string);
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
    if (!id) return;
    
    setFriendActionLoading(true);
    try {
      await FriendsService.removeFriend(id as string);
      setFriendshipStatus('none');
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setFriendActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
        }}
      />
      <View style={styles.profileHeader}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.border }]}>
            <Ionicons name="person" size={40} color={theme.text} />
          </View>
        )}
        
        <Text style={[styles.displayName, { color: theme.text }]}>
          {user.displayName}
        </Text>
        
        {/* Add Edit Profile button when viewing your own profile */}
        {auth.currentUser?.uid === id && (
          <CustomButton
            title="Edit Profile"
            onPress={() => router.push('/profile/edit')}
            style={styles.editButton}
            secondary
          />
        )}
        
        <View style={styles.profileDetails}>
          {/* Bio Section */}
          <View style={styles.profileSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle-outline" size={18} color={theme.text} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Bio</Text>
            </View>
            <Text style={[styles.sectionContent, { color: theme.text }]}>
              {user.bio || 'No bio available'}
            </Text>
          </View>
          
          {/* Location Section */}
          {(user.location?.city || user.location?.province) && (
            <View style={styles.profileSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="location-outline" size={18} color={theme.text} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
              </View>
              <Text style={[styles.sectionContent, { color: theme.text }]}>
                {[user.location.city, user.location.province].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
          
          {/* Interests Section */}
          {user.interests && user.interests.length > 0 && (
            <View style={styles.profileSection}>
              <View style={styles.sectionHeader}>
                <Ionicons name="heart-outline" size={18} color={theme.text} />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Interests</Text>
              </View>
              <View style={styles.interestsContainer}>
                {user.interests.map((interest, index) => (
                  <View 
                    key={index} 
                    style={[styles.interestTag, { backgroundColor: theme.primary + '20' }]}
                  >
                    <Text style={[styles.interestText, { color: theme.primary }]}>
                      {interest}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        
        {/* Only show action buttons if not viewing own profile */}
        {auth.currentUser?.uid !== id && (
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
              <View style={styles.requestButtons}>
                <CustomButton
                  title="Accept"
                  onPress={handleAcceptFriendRequest}
                  loading={friendActionLoading}
                  style={[styles.actionButton, styles.requestButton]}
                />
                <CustomButton
                  title="Reject"
                  onPress={handleRejectFriendRequest}
                  loading={friendActionLoading}
                  style={[styles.actionButton, styles.requestButton]}
                  secondary
                />
              </View>
            )}
            
            {friendshipStatus === 'friends' && (
              <CustomButton
                title="Remove Friend"
                onPress={handleRemoveFriend}
                loading={friendActionLoading}
                style={styles.actionButton}
                secondary
              />
            )}
            
            {/* Message button */}
            <CustomButton
              title="Send Message"
              onPress={handleMessage}
              style={styles.actionButton}
            />
          </View>
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Events by {user.displayName}
      </Text>

      {userEvents.length > 0 ? (
        userEvents.map(event => (
          <EventCard key={event.id} event={event} />
        ))
      ) : (
        <Text style={[styles.noEvents, { color: theme.text }]}>
          No events created yet
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  profileDetails: {
    width: '100%',
    marginTop: 10,
    marginBottom: 15,
  },
  profileSection: {
    marginBottom: 16,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    fontFamily: 'Roboto',
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 20,
    paddingLeft: 26,
    fontFamily: 'Roboto',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 26,
  },
  interestTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  interestText: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  actionButton: {
    marginTop: 8,
    minWidth: 120,
  },
  editButton: {
    marginTop: 8,
    marginBottom: 16,
    width: 140,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  noEvents: {
    textAlign: 'center',
    padding: 20,
    opacity: 0.7,
  },
}); 