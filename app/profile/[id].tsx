import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, FlatList, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, getDoc } from 'firebase/firestore';
import { Event, EventsService } from '../../services/events.service';
import { MessagesService } from '../../services/messages.service';
import { FriendsService, FriendRequestStatus } from '../../services/friends.service';
import { User, UserService } from '../../services/user.service';
import { CustomButton } from '../../components/shared/CustomButton';
import { EventCard } from '../../components/events/EventCard';
import UserRating from '../../components/UserRating';

const { width } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const GRID_GAP = 8; // Horizontal and vertical gap between grid items
const ITEM_WIDTH = (width - (NUM_COLUMNS - 1) * GRID_GAP - 32) / NUM_COLUMNS;

type ViewMode = string;

export default function UserProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams(); 
  
  const [displayName, setDisplayName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [attendingEvents, setAttendingEvents] = useState<Event[]>([]);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [attendingCount, setAttendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'sent' | 'received' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | undefined>(undefined);
  const [friendActionLoading, setFriendActionLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<'created' | 'joined'>('created');
  
  const userId = id as string;

  // Redirect to the profile tab if viewing your own profile
  useEffect(() => {
    if (auth.currentUser && userId === auth.currentUser.uid) {
      router.replace('/(tabs)/profile');
    }
  }, [userId]);

  // Function to fetch user profile data
  const fetchUserProfile = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      if (!userId) {
        setError('User not found');
        setLoading(false);
        setRefreshing(false);
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
        setRefreshing(false);
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
      
      // Fetch events user is attending
      try {
        const attending = await EventsService.getEventsAttending(userId);
        setAttendingEvents(attending);
      } catch (error) {
        console.error('Error fetching attending events:', error);
      }
      
      // Fetch friends count
      try {
        const count = await FriendsService.getFriendsCount(userId);
        setFriendsCount(count);
      } catch (error) {
        console.error('Error fetching friends count:', error);
      }
      
      // Fetch attended events count
      try {
        const count = await EventsService.getAttendingEventsCount(userId);
        setAttendingCount(count);
      } catch (error) {
        console.error('Error fetching attending events count:', error);
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
      setRefreshing(false);
    }
  };

  // Refresh handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserProfile(false);
  }, [userId]);

  // Fetch on mount only
  useEffect(() => {
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
    
    try {
      setFriendActionLoading(true);
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
      {/* Header with profile title and back button */}
      <View style={[styles.header, { 
        paddingTop: insets.top,
        backgroundColor: theme.background,
        borderBottomColor: theme.border,
        borderBottomWidth: 1
      }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.card }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.username, { color: theme.text }]}>{displayName}</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {viewMode === 'grid' ? (
        <FlatList
          key="grid"
          data={activeTab === 'created' 
            ? [...userEvents].sort((a, b) => {
                const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime(); // Newest first
              })
            : [...attendingEvents].sort((a, b) => {
                const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime(); // Newest first
              })
          }
          renderItem={({ item, index }) => {
            // Calculate the column position
            const column = index % NUM_COLUMNS;
            return (
              <TouchableOpacity
                style={[
                  styles.gridItem, 
                  { 
                    width: ITEM_WIDTH,
                    marginLeft: column > 0 ? GRID_GAP : 0 
                  }
                ]}
                onPress={() => router.push(`/event/${item.id}`)}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.gridItemImage}
                  />
                ) : (
                  <View style={[styles.noImageContainer, { backgroundColor: theme.card }]}>
                    <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={() => (
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.profileImage}
                    defaultSource={require('../../assets/default-avatar.png')}
                  />
                ) : (
                  <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.border }]}>
                    <Ionicons name="person" size={32} color={theme.text} />
                  </View>
                )}
                
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                    <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{friendsCount}</Text>
                    <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{attendingCount}</Text>
                    <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Attending</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.displayName, { color: theme.text }]}>
                {displayName}
              </Text>
              
              <View style={styles.ratingContainer}>
                <UserRating userId={userId} />
              </View>
              
              <Text style={[styles.bio, { color: theme.text }]}>
                {userBio || 'No bio available.'}
              </Text>
              
              <View style={styles.actionButtons}>
                {friendshipStatus === 'none' && (
                  <CustomButton 
                    title="Add Friend"
                    onPress={handleSendFriendRequest}
                    style={{ flex: 1, marginRight: 8 }}
                    loading={friendActionLoading}
                    icon="person-add-outline"
                  />
                )}
                
                {friendshipStatus === 'sent' && (
                  <CustomButton 
                    title="Cancel Request"
                    onPress={handleCancelFriendRequest}
                    style={{ flex: 1, marginRight: 8 }}
                    secondary
                    loading={friendActionLoading}
                    icon="close-circle-outline"
                  />
                )}
                
                {friendshipStatus === 'received' && (
                  <>
                    <CustomButton 
                      title="Accept"
                      onPress={handleAcceptFriendRequest}
                      style={{ flex: 1, marginRight: 8 }}
                      loading={friendActionLoading}
                      icon="checkmark"
                    />
                    <CustomButton 
                      title="Reject"
                      onPress={handleRejectFriendRequest}
                      style={{ flex: 1 }}
                      secondary
                      loading={friendActionLoading}
                      icon="close"
                    />
                  </>
                )}
                
                {friendshipStatus === 'friends' && (
                  <CustomButton 
                    title="Remove Friend"
                    onPress={handleRemoveFriend}
                    style={{ flex: 1, marginRight: 8 }}
                    secondary
                    loading={friendActionLoading}
                    icon="person-remove-outline"
                  />
                )}
                
                <CustomButton 
                  title="Message"
                  onPress={handleMessage}
                  style={{ flex: 1 }}
                  icon="chatbubble-outline"
                  secondary={friendshipStatus === 'received'}
                />
              </View>
              
              {/* Tabs for Events */}
              <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    { borderBottomColor: activeTab === 'created' ? theme.primary : 'transparent',
                      borderBottomWidth: activeTab === 'created' ? 2 : 0 }
                  ]}
                  onPress={() => setActiveTab('created')}
                >
                  <Text style={{ 
                    color: activeTab === 'created' ? theme.primary : theme.text + '80',
                    fontWeight: activeTab === 'created' ? 'bold' : 'normal',
                    fontSize: 14
                  }}>
                    Created
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    { borderBottomColor: activeTab === 'joined' ? theme.primary : 'transparent',
                      borderBottomWidth: activeTab === 'joined' ? 2 : 0 }
                  ]}
                  onPress={() => setActiveTab('joined')}
                >
                  <Text style={{ 
                    color: activeTab === 'joined' ? theme.primary : theme.text + '80',
                    fontWeight: activeTab === 'joined' ? 'bold' : 'normal',
                    fontSize: 14
                  }}>
                    Joined
                  </Text>
                </TouchableOpacity>
                
                <View style={[styles.viewToggle, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode.includes('grid') ? { backgroundColor: theme.primary } : undefined
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons 
                      name="grid" 
                      size={18} 
                      color={viewMode.includes('grid') ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode.includes('list') ? { backgroundColor: theme.primary } : undefined
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons 
                      name="list" 
                      size={18} 
                      color={viewMode.includes('list') ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              
              {userEvents.length === 0 && (
                <View style={styles.emptyEventsContainer}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                    <Ionicons name="calendar-outline" size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyEventsText, { color: theme.text }]}>
                    {activeTab === 'created' ? 'No created events' : 'No joined events'}
                  </Text>
                  <Text style={[styles.emptyEventsSubtext, { color: theme.text + '80' }]}>
                    {activeTab === 'created'
                      ? "This user hasn't created any events yet"
                      : "This user hasn't joined any events yet"}
                  </Text>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={userEvents.length > 0 ? null : (
            <View style={{ height: 100 }} />
          )}
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16
          }}
        />
      ) : (
        <FlatList
          key="list"
          data={activeTab === 'created' 
            ? [...userEvents].sort((a, b) => {
                const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime(); // Newest first
              })
            : [...attendingEvents].sort((a, b) => {
                const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
                return dateB.getTime() - dateA.getTime(); // Newest first
              })
          }
          renderItem={({ item }) => (
            <EventCard event={item} />
          )}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16
          }}
          ListHeaderComponent={() => (
            <View style={styles.profileSection}>
              <View style={styles.profileHeader}>
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.profileImage}
                    defaultSource={require('../../assets/default-avatar.png')}
                  />
                ) : (
                  <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.border }]}>
                    <Ionicons name="person" size={32} color={theme.text} />
                  </View>
                )}
                
                <View style={styles.statsContainer}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                    <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{friendsCount}</Text>
                    <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
                  </View>
                  
                  <View style={styles.statItem}>
                    <Text style={[styles.statNumber, { color: theme.text }]}>{attendingCount}</Text>
                    <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Attending</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.displayName, { color: theme.text }]}>
                {displayName}
              </Text>
              
              <View style={styles.ratingContainer}>
                <UserRating userId={userId} />
              </View>
              
              <Text style={[styles.bio, { color: theme.text }]}>
                {userBio || 'No bio available.'}
              </Text>
              
              <View style={styles.actionButtons}>
                {friendshipStatus === 'none' && (
                  <CustomButton 
                    title="Add Friend"
                    onPress={handleSendFriendRequest}
                    style={{ flex: 1, marginRight: 8 }}
                    loading={friendActionLoading}
                    icon="person-add-outline"
                  />
                )}
                
                {friendshipStatus === 'sent' && (
                  <CustomButton 
                    title="Cancel Request"
                    onPress={handleCancelFriendRequest}
                    style={{ flex: 1, marginRight: 8 }}
                    secondary
                    loading={friendActionLoading}
                    icon="close-circle-outline"
                  />
                )}
                
                {friendshipStatus === 'received' && (
                  <>
                    <CustomButton 
                      title="Accept"
                      onPress={handleAcceptFriendRequest}
                      style={{ flex: 1, marginRight: 8 }}
                      loading={friendActionLoading}
                      icon="checkmark"
                    />
                    <CustomButton 
                      title="Reject"
                      onPress={handleRejectFriendRequest}
                      style={{ flex: 1 }}
                      secondary
                      loading={friendActionLoading}
                      icon="close"
                    />
                  </>
                )}
                
                {friendshipStatus === 'friends' && (
                  <CustomButton 
                    title="Remove Friend"
                    onPress={handleRemoveFriend}
                    style={{ flex: 1, marginRight: 8 }}
                    secondary
                    loading={friendActionLoading}
                    icon="person-remove-outline"
                  />
                )}
                
                <CustomButton 
                  title="Message"
                  onPress={handleMessage}
                  style={{ flex: 1 }}
                  icon="chatbubble-outline"
                  secondary={friendshipStatus === 'received'}
                />
              </View>
              
              {/* Tabs for Events */}
              <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    { borderBottomColor: activeTab === 'created' ? theme.primary : 'transparent',
                      borderBottomWidth: activeTab === 'created' ? 2 : 0 }
                  ]}
                  onPress={() => setActiveTab('created')}
                >
                  <Text style={{ 
                    color: activeTab === 'created' ? theme.primary : theme.text + '80',
                    fontWeight: activeTab === 'created' ? 'bold' : 'normal',
                    fontSize: 14
                  }}>
                    Created
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.tabButton, 
                    { borderBottomColor: activeTab === 'joined' ? theme.primary : 'transparent',
                      borderBottomWidth: activeTab === 'joined' ? 2 : 0 }
                  ]}
                  onPress={() => setActiveTab('joined')}
                >
                  <Text style={{ 
                    color: activeTab === 'joined' ? theme.primary : theme.text + '80',
                    fontWeight: activeTab === 'joined' ? 'bold' : 'normal',
                    fontSize: 14
                  }}>
                    Joined
                  </Text>
                </TouchableOpacity>
                
                <View style={[styles.viewToggle, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode.includes('grid') ? { backgroundColor: theme.primary } : undefined
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons 
                      name="grid" 
                      size={18} 
                      color={viewMode.includes('grid') ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode.includes('list') ? { backgroundColor: theme.primary } : undefined
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons 
                      name="list" 
                      size={18} 
                      color={viewMode.includes('list') ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyEventsContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="calendar-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyEventsText, { color: theme.text }]}>
                {activeTab === 'created' ? 'No created events' : 'No joined events'}
              </Text>
              <Text style={[styles.emptyEventsSubtext, { color: theme.text + '80' }]}>
                {activeTab === 'created'
                  ? "This user hasn't created any events yet"
                  : "This user hasn't joined any events yet"}
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
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    marginTop: 8,
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
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
  },
  toggleButton: {
    padding: 8,
    width: 36,
    alignItems: 'center',
  },
  gridItem: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
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
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
    fontFamily: 'Roboto',
  },
  ratingContainer: {
    marginBottom: 8,
    zIndex: 1,
  },
  noImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
