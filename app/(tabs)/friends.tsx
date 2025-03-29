import { View, Text, StyleSheet, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { FriendsService, FriendRequestStatus, FriendRequest, Friend } from '../../services/friends.service';
import { UserService } from '../../services/user.service';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../services/user.service';
import { CustomButton } from '../../components/shared/CustomButton';
import React from 'react';

type FriendItemProps = {
  friend: Friend;
  onPress: () => void;
  onRemove: () => void;
};

const FriendItem = ({ friend, onPress, onRemove }: FriendItemProps) => {
  const { theme } = useTheme();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await UserService.getUser(friend.friendId);
        setUserData(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [friend.friendId]);

  if (loading) {
    return (
      <View style={[styles.friendItem, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  if (!userData) return null;

  return (
    <Pressable 
      style={[styles.friendItem, { backgroundColor: theme.card }]} 
      onPress={onPress}
    >
      {userData.photoURL ? (
        <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
          <Ionicons name="person" size={24} color={theme.text} />
        </View>
      )}
      
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: theme.text }]}>
          {userData.displayName}
        </Text>
        <Text style={[styles.friendBio, { color: theme.text }]} numberOfLines={1}>
          {userData.bio || 'No bio available'}
        </Text>
      </View>
      
      <CustomButton
        title="Remove"
        onPress={onRemove}
        secondary
        style={styles.actionButton}
      />
    </Pressable>
  );
};

type RequestItemProps = {
  request: FriendRequest;
  onAccept: () => void;
  onReject: () => void;
  onPress: () => void;
};

const RequestItem = ({ request, onAccept, onReject, onPress }: RequestItemProps) => {
  const { theme } = useTheme();
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get the sender's data for incoming requests
        const user = await UserService.getUser(request.senderId);
        setUserData(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [request.senderId]);

  if (loading) {
    return (
      <View style={[styles.friendItem, { backgroundColor: theme.card }]}>
        <ActivityIndicator size="small" color={theme.text} />
      </View>
    );
  }

  if (!userData) return null;

  return (
    <Pressable 
      style={[styles.friendItem, { backgroundColor: theme.card }]} 
      onPress={onPress}
    >
      {userData.photoURL ? (
        <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
          <Ionicons name="person" size={24} color={theme.text} />
        </View>
      )}
      
      <View style={styles.friendInfo}>
        <Text style={[styles.friendName, { color: theme.text }]}>
          {userData.displayName}
        </Text>
        <Text style={[styles.friendBio, { color: theme.text }]} numberOfLines={1}>
          {userData.bio || 'No bio available'}
        </Text>
      </View>
      
      <View style={styles.requestButtons}>
        <CustomButton
          title="Accept"
          onPress={onAccept}
          style={styles.requestButton}
        />
        <CustomButton
          title="Reject"
          onPress={onReject}
          secondary
          style={styles.requestButton}
        />
      </View>
    </Pressable>
  );
};

export default function FriendsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const isLoadingRef = useRef(false);
  const lastLoadTime = useRef(Date.now());

  const loadData = async () => {
    // Prevent duplicate loading
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Load friends
      const friendsData = await FriendsService.getFriends();
      setFriends(friendsData);
      
      // Load friend requests
      const requestsData = await FriendsService.getIncomingFriendRequests();
      setRequests(requestsData);
      
      // Update last load time
      lastLoadTime.current = Date.now();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Only load if:
      // 1. We don't have any friends/requests data yet, or
      // 2. It's been more than 30 seconds since last load
      if (
        (friends.length === 0 && requests.length === 0) || 
        Date.now() - lastLoadTime.current > 30000
      ) {
        loadData();
      }
    }, [])
  );

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await FriendsService.removeFriend(friendId);
      // Refresh friends list
      setFriends(friends.filter(friend => friend.friendId !== friendId));
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await FriendsService.respondToFriendRequest(requestId, FriendRequestStatus.ACCEPTED);
      // Refresh data
      loadData();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await FriendsService.respondToFriendRequest(requestId, FriendRequestStatus.REJECTED);
      // Remove from the requests list
      setRequests(requests.filter(request => request.id !== requestId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.tabBar}>
        <Pressable 
          style={[
            styles.tab, 
            activeTab === 'friends' && [styles.activeTab, { borderBottomColor: theme.primary }]
          ]} 
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'friends' ? theme.primary : theme.text }
          ]}>
            Friends
          </Text>
        </Pressable>
        
        <Pressable 
          style={[
            styles.tab, 
            activeTab === 'requests' && [styles.activeTab, { borderBottomColor: theme.primary }]
          ]} 
          onPress={() => setActiveTab('requests')}
        >
          <Text style={[
            styles.tabText, 
            { color: activeTab === 'requests' ? theme.primary : theme.text }
          ]}>
            Requests {requests.length > 0 && `(${requests.length})`}
          </Text>
        </Pressable>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.text} />
        </View>
      ) : (
        <>
          {activeTab === 'friends' && (
            <>
              {friends.length > 0 ? (
                <FlatList
                  data={friends}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <FriendItem
                      friend={item}
                      onPress={() => router.push(`/profile/${item.friendId}`)}
                      onRemove={() => handleRemoveFriend(item.friendId)}
                    />
                  )}
                  contentContainerStyle={styles.listContent}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.text }]}>
                    You don't have any friends yet
                  </Text>
                </View>
              )}
            </>
          )}
          
          {activeTab === 'requests' && (
            <>
              {requests.length > 0 ? (
                <FlatList
                  data={requests}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <RequestItem
                      request={item}
                      onAccept={() => handleAcceptRequest(item.id)}
                      onReject={() => handleRejectRequest(item.id)}
                      onPress={() => router.push(`/profile/${item.senderId}`)}
                    />
                  )}
                  contentContainerStyle={styles.listContent}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={[styles.emptyText, { color: theme.text }]}>
                    No pending friend requests
                  </Text>
                </View>
              )}
            </>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  friendItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 12,
  },
  friendName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  friendBio: {
    fontSize: 14,
    opacity: 0.7,
  },
  actionButton: {
    width: 80,
  },
  requestButtons: {
    flexDirection: 'row',
  },
  requestButton: {
    width: 70,
    marginLeft: 8,
    paddingVertical: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
}); 