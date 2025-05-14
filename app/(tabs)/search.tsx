import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserService, User } from '../../services/user.service';

// For the search screen, we'll use a combined type to handle both User and other user types
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

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [recentSearches, setRecentSearches] = useState<DisplayUser[]>([]);

  // Debounce function to prevent too many API calls
  const debounce = <F extends (...args: any[]) => any>(
    func: F,
    waitFor: number
  ) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<F>): Promise<ReturnType<F>> => {
      if (timeout) {
        clearTimeout(timeout);
      }
      
      return new Promise(resolve => {
        timeout = setTimeout(() => resolve(func(...args)), waitFor);
      });
    };
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setUsers([]);
        setSearchPerformed(false);
        return;
      }
      
      try {
        const results = await UserService.searchUsers(query);
        // Convert User types to DisplayUser
        const displayUsers: DisplayUser[] = results.map(user => ({
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          username: user.username
        }));
        setUsers(displayUsers);
        setSearchPerformed(true);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setLoading(false);
      }
    }, 300), // 300ms debounce time
    []
  );

  // Effect to trigger search when searchQuery changes
  useEffect(() => {
    if (searchQuery.length > 0) {
      setLoading(true);
      debouncedSearch(searchQuery);
    } else {
      setUsers([]);
      setSearchPerformed(false);
      setLoading(false);
    }
  }, [searchQuery, debouncedSearch]);

  // Load recent searches on mount
  useEffect(() => {
    // In a real app, these would be stored in local storage or user preferences
    // For this example, we'll just use a placeholder
    const loadRecentSearches = async () => {
      try {
        // This would come from local storage in a real app
        // const savedRecents = await AsyncStorage.getItem('recentSearches');
        // if (savedRecents) {
        //   setRecentSearches(JSON.parse(savedRecents));
        // }
        
        // For now, let's just use an empty array
        setRecentSearches([]);
      } catch (error) {
        console.error('Error loading recent searches:', error);
      }
    };
    
    loadRecentSearches();
  }, []);

  // Save search to recents when user taps on a result
  const handleUserPress = (user: DisplayUser) => {
    // Save to recent searches
    const updatedRecents = [user, ...recentSearches.filter(item => item.id !== user.id)].slice(0, 10);
    setRecentSearches(updatedRecents);
    
    // In a real app, save to local storage
    // AsyncStorage.setItem('recentSearches', JSON.stringify(updatedRecents));
    
    // Navigate to user profile
    router.push(`/profile/${user.id}`);
  };

  const renderUserItem = ({ item }: { item: DisplayUser }) => (
    <Pressable 
      style={[styles.userItem, { borderBottomColor: theme.border }]}
      onPress={() => handleUserPress(item)}
    >
      <UserAvatar uri={item.photoURL} size={50} />
      <View style={styles.userInfo}>
        <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
        <Text style={[styles.userUsername, { color: theme.textSecondary }]}>
          {item.username ? `@${item.username}` : item.email}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
    </Pressable>
  );

  const renderRecentItem = ({ item }: { item: DisplayUser }) => (
    <Pressable
      style={[styles.recentItem, { borderBottomColor: theme.border }]}
      onPress={() => handleUserPress(item)}
    >
      <View style={styles.recentLeft}>
        <UserAvatar uri={item.photoURL} size={40} />
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
          <Text style={[styles.userUsername, { color: theme.textSecondary }]}>
            {item.username ? `@${item.username}` : item.email}
          </Text>
        </View>
      </View>
      <Ionicons name="close" size={20} color={theme.textSecondary} onPress={(e) => {
        e.stopPropagation();
        setRecentSearches(recentSearches.filter(recent => recent.id !== item.id));
        // In a real app, update local storage
        // AsyncStorage.setItem('recentSearches', JSON.stringify(recentSearches.filter(recent => recent.id !== item.id)));
      }} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.background }} />
      
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Search</Text>
      </View>
      
      <View style={[styles.searchContainer, { backgroundColor: theme.inputBackground }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search users..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : searchPerformed ? (
        users.length > 0 ? (
          <FlatList
            data={users}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No users found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Try another search term
            </Text>
          </View>
        )
      ) : (
        <>
          {recentSearches.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Searches</Text>
                <Pressable onPress={() => {
                  setRecentSearches([]);
                  // In a real app, clear from local storage
                  // AsyncStorage.removeItem('recentSearches');
                }}>
                  <Text style={[styles.clearAll, { color: theme.primary }]}>Clear All</Text>
                </Pressable>
              </View>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingBottom: 16 }}
              />
            </>
          )}
          {recentSearches.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
              <Text style={[styles.emptyText, { color: theme.text }]}>Search for users</Text>
              <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                Find people by name or username
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
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
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  clearAll: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
}); 