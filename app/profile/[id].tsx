import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Event } from '../../services/events.service';
import { MessagesService } from '../../services/messages.service';
import { FriendsService, FriendRequestStatus } from '../../services/friends.service';
import { User, UserService } from '../../services/user.service';
import { CustomButton } from '../../components/shared/CustomButton';
import { EventCard } from '../../components/events/EventCard';

const { width } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const ITEM_WIDTH = (width - (NUM_COLUMNS - 1) * GRID_SPACING - 32) / NUM_COLUMNS;

type ViewMode = 'grid' | 'list';

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  
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
      <Pressable
        style={[styles.backButton, { backgroundColor: theme.card + '80' }]}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      
      {viewMode === 'grid' ? (
        <FlatList
          key={`grid-${viewMode}`}
          data={[...userEvents].sort((a, b) => {
            const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Newest first
          })}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.gridItem, { width: ITEM_WIDTH }]}
              onPress={() => router.push(`/event/${item.id}`)}
            >
              <Image
                source={{ uri: item.imageUrl || 'https://via.placeholder.com/150' }}
                style={styles.gridItemImage}
              />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={{ 
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16
          }}
          ListHeaderComponent={() => (
            <>
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  {profileImage ? (
                    <Image 
                      source={{ uri: profileImage }} 
                      style={styles.profileImage} 
                    />
                  ) : (
                    <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.card }]}>
                      <Text style={[styles.profileImageText, { color: theme.primary }]}>
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>0</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[styles.displayName, { color: theme.text }]}>{displayName}</Text>
                
                {userBio ? (
                  <Text style={[styles.bio, { color: theme.text + 'DD' }]}>{userBio}</Text>
                ) : (
                  <Text style={[styles.bio, { color: theme.text + '80' }]}>No bio yet</Text>
                )}
                
                <View style={styles.actionButtons}>
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
                      title="Cancel Friend Request" 
                      onPress={handleCancelFriendRequest}
                      secondary
                      loading={friendActionLoading}
                      style={styles.actionButton}
                    />
                  )}
                  
                  {friendshipStatus === 'received' && (
                    <View style={styles.rowButtons}>
                      <CustomButton 
                        title="Accept" 
                        onPress={handleAcceptFriendRequest}
                        loading={friendActionLoading}
                        style={styles.halfButton}
                      />
                      <CustomButton 
                        title="Decline" 
                        onPress={handleRejectFriendRequest}
                        secondary
                        loading={friendActionLoading}
                        style={styles.halfButton}
                      />
                    </View>
                  )}
                  
                  {friendshipStatus === 'friends' && (
                    <CustomButton 
                      title="Remove Friend" 
                      onPress={handleRemoveFriend}
                      secondary
                      loading={friendActionLoading}
                      style={styles.actionButton}
                    />
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.messageButton, { borderColor: theme.primary, borderWidth: 1 }]}
                    onPress={handleMessage}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
                    <Text style={[styles.messageButtonText, { color: theme.primary }]}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.eventsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Events
                  </Text>
                  
                  <View style={[styles.viewToggle, { backgroundColor: theme.card }]}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        viewMode === ('grid' as ViewMode) && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setViewMode('grid')}
                    >
                      <Ionicons 
                        name="grid" 
                        size={18} 
                        color={viewMode === ('grid' as ViewMode) ? 'white' : theme.text}
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        viewMode === ('list' as ViewMode) && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setViewMode('list')}
                    >
                      <Ionicons 
                        name="list" 
                        size={18} 
                        color={viewMode === ('list' as ViewMode) ? 'white' : theme.text}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {userEvents.length === 0 && (
                  <View style={styles.emptyEventsContainer}>
                    <Text style={[styles.emptyEventsText, { color: theme.text + '80' }]}>
                      No events yet
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        />
      ) : (
        <FlatList
          key={`list-${viewMode}`}
          data={[...userEvents].sort((a, b) => {
            const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Newest first
          })}
          renderItem={({ item }) => (
            <EventCard event={item} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ 
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16
          }}
          ListHeaderComponent={() => (
            <>
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  {profileImage ? (
                    <Image 
                      source={{ uri: profileImage }} 
                      style={styles.profileImage} 
                    />
                  ) : (
                    <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.card }]}>
                      <Text style={[styles.profileImageText, { color: theme.primary }]}>
                        {displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>0</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[styles.displayName, { color: theme.text }]}>{displayName}</Text>
                
                {userBio ? (
                  <Text style={[styles.bio, { color: theme.text + 'DD' }]}>{userBio}</Text>
                ) : (
                  <Text style={[styles.bio, { color: theme.text + '80' }]}>No bio yet</Text>
                )}
                
                <View style={styles.actionButtons}>
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
                      title="Cancel Friend Request" 
                      onPress={handleCancelFriendRequest}
                      secondary
                      loading={friendActionLoading}
                      style={styles.actionButton}
                    />
                  )}
                  
                  {friendshipStatus === 'received' && (
                    <View style={styles.rowButtons}>
                      <CustomButton 
                        title="Accept" 
                        onPress={handleAcceptFriendRequest}
                        loading={friendActionLoading}
                        style={styles.halfButton}
                      />
                      <CustomButton 
                        title="Decline" 
                        onPress={handleRejectFriendRequest}
                        secondary
                        loading={friendActionLoading}
                        style={styles.halfButton}
                      />
                    </View>
                  )}
                  
                  {friendshipStatus === 'friends' && (
                    <CustomButton 
                      title="Remove Friend" 
                      onPress={handleRemoveFriend}
                      secondary
                      loading={friendActionLoading}
                      style={styles.actionButton}
                    />
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.messageButton, { borderColor: theme.primary, borderWidth: 1 }]}
                    onPress={handleMessage}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color={theme.primary} />
                    <Text style={[styles.messageButtonText, { color: theme.primary }]}>Message</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.eventsSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Events
                  </Text>
                  
                  <View style={[styles.viewToggle, { backgroundColor: theme.card }]}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        viewMode === ('grid' as ViewMode) && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setViewMode('grid')}
                    >
                      <Ionicons 
                        name="grid" 
                        size={18} 
                        color={viewMode === ('grid' as ViewMode) ? 'white' : theme.text}
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        viewMode === ('list' as ViewMode) && { backgroundColor: theme.primary }
                      ]}
                      onPress={() => setViewMode('list')}
                    >
                      <Ionicons 
                        name="list" 
                        size={18} 
                        color={viewMode === ('list' as ViewMode) ? 'white' : theme.text}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {userEvents.length === 0 && (
                  <View style={styles.emptyEventsContainer}>
                    <Text style={[styles.emptyEventsText, { color: theme.text + '80' }]}>
                      No events yet
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
          ListEmptyComponent={
            <View style={styles.emptyEventsContainer}>
              <Text style={[styles.emptyEventsText, { color: theme.text + '80' }]}>
                No events yet
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
  },
  profileSection: {
    padding: 16,
    paddingTop: 60, // Space for the back button
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
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileImageText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
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
  eventsSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
  },
  toggleButton: {
    padding: 8,
    width: 36,
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_SPACING,
  },
  gridItem: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  emptyEventsContainer: {
    marginTop: 24,
    padding: 16,
    alignItems: 'center',
  },
  emptyEventsText: {
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
}); 