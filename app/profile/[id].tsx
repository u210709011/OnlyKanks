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
        
        <Text style={[styles.bio, { color: theme.text }]}>
          {user.bio || 'No bio available'}
        </Text>
        
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
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  noEvents: {
    textAlign: 'center',
    padding: 20,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
  actionButtons: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 32,
  },
  actionButton: {
    marginTop: 8,
  },
  messageButton: {
    marginTop: 16,
    width: 200,
    alignSelf: 'center',
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  requestButton: {
    flex: 1,
    marginHorizontal: 4,
  },
}); 