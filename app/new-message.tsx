import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Pressable, ActivityIndicator, Image } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useTheme } from '../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { UserService, User } from '../services/user.service';
import { MessagesService } from '../services/messages.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../config/firebase';
import { AppHeader } from '../components/shared/AppHeader';

// For the new message screen, we'll use a combined type 
type DisplayUser = {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
  username?: string;
};

// Inline avatar component
const UserAvatar = ({ uri, size = 50 }: { uri?: string | null, size?: number }) => {
  const { theme } = useTheme();
  
  if (!uri) {
    return (
      <View 
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.text + '20',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <Ionicons name="person" size={size * 0.6} color={theme.text + '70'} />
      </View>
    );
  }
  
  return (
    <Image 
      source={{ uri }} 
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E1E1E1',
      }} 
    />
  );
};

export default function NewMessageScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<DisplayUser[]>([]);

  useEffect(() => {
    // Load friends or recent chat partners when screen opens
    loadInitialUsers();
  }, []);

  // Load initial users (friends or recent chats)
  const loadInitialUsers = async () => {
    setLoading(true);
    try {
      const friendsList = await UserService.getFriends();
      
      // Convert User types to DisplayUser
      const displayUsers: DisplayUser[] = friendsList.map(user => ({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        username: user.username
      }));
      
      setUsers(displayUsers);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInitialUsers();
      return;
    }

    setLoading(true);
    try {
      const results = await UserService.searchUsers(searchQuery);
      
      // Filter out current user from results
      const filteredResults = results.filter(user => user.id !== auth.currentUser?.uid);
      
      // Convert User types to DisplayUser
      const displayUsers: DisplayUser[] = filteredResults.map(user => ({
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        username: user.username
      }));
      
      setUsers(displayUsers);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle user selection
  const toggleUserSelection = (user: DisplayUser) => {
    // For now, we only support 1-on-1 chats
    setSelectedUsers([user]);
    startChat(user);
  };

  // Start a chat with selected users
  const startChat = async (user: DisplayUser) => {
    try {
      // Check if chat already exists
      const existingChatId = await MessagesService.findExistingChat(user.id);
      
      if (existingChatId) {
        // Navigate to existing chat
        router.push(`/chat/${existingChatId}`);
      } else {
        // Create new chat
        const chatId = await MessagesService.createChat(user.id);
        router.push(`/chat/${chatId}`);
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const renderUserItem = ({ item }: { item: DisplayUser }) => {
    const isSelected = selectedUsers.some(user => user.id === item.id);
    
    return (
      <Pressable 
        style={[
          styles.userItem, 
          { borderBottomColor: theme.border },
          isSelected && { backgroundColor: theme.primary + '10' }
        ]}
        onPress={() => toggleUserSelection(item)}
      >
        <UserAvatar uri={item.photoURL} size={50} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
          <Text style={[styles.userUsername, { color: theme.text + '80' }]}>
            {item.username ? `@${item.username}` : item.email}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color={theme.primary} />
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{
          headerShown: false
        }}
      />
      <AppHeader 
        title="New Message" 
        showBackButton={true}
      />
      
      <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search for people..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => {
            setSearchQuery('');
            loadInitialUsers();
          }} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {searchQuery ? 'Search Results' : 'Friends'}
          </Text>
          
          {users.length > 0 ? (
            <FlatList
              data={users}
              renderItem={renderUserItem}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: theme.text }]}>
                {searchQuery ? 'No users found' : 'No friends yet'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                {searchQuery ? 'Try another search term' : 'Add friends to start chatting'}
              </Text>
            </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  clearButton: {
    padding: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginVertical: 8,
    fontFamily: 'Roboto',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  userUsername: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
}); 