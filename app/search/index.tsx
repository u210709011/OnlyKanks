import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/theme.context';
import { UserService, User } from '../../services/user.service';
import { useRouter } from 'expo-router';
import debounce from 'lodash.debounce';

export default function SearchScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Create a debounced search function to avoid too many queries
  const debouncedSearch = React.useCallback(
    debounce(async (query: string) => {
      if (query.trim().length > 0) {
        setIsLoading(true);
        console.log('Searching for users with query:', query);
        try {
          const results = await UserService.searchUsers(query);
          console.log('Search results:', results.length > 0 ? results : 'No results found');
          setUsers(results);
          setHasSearched(true);
        } catch (error) {
          console.error('Error during search:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUsers([]);
        setIsLoading(false);
        setHasSearched(false);
      }
    }, 500),
    []
  );

  // Trigger search when query changes
  useEffect(() => {
    debouncedSearch(searchQuery);
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length === 0) {
      setUsers([]);
      setHasSearched(false);
    }
  };

  const navigateToUserProfile = (userId: string) => {
    router.push(`/profile/${userId}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Search People</Text>
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => router.push('/search/debug')}
        >
          <Ionicons name="bug-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card }]}>
        <Ionicons name="search" size={20} color={theme.text + '80'} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search by name"
          placeholderTextColor={theme.text + '60'}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoFocus
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={20} color={theme.text + '80'} />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.userItem, { borderBottomColor: theme.border }]}
              onPress={() => navigateToUserProfile(item.id)}
            >
              <Image
                source={item.photoURL ? { uri: item.photoURL } : require('../../assets/default-avatar.png')}
                style={styles.userImage}
              />
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>{item.displayName}</Text>
                {item.bio && (
                  <Text
                    style={[styles.userBio, { color: theme.text + '80' }]}
                    numberOfLines={1}
                  >
                    {item.bio}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.text + '60'} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              {hasSearched ? (
                <>
                  <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                    <Ionicons name="people-outline" size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No users found</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.text + '80' }]}>
                    Try a different search term
                  </Text>
                </>
              ) : searchQuery.length > 0 ? (
                <Text style={[styles.emptySubtitle, { color: theme.text + '80' }]}>
                  Searching...
                </Text>
              ) : (
                <>
                  <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                    <Ionicons name="search-outline" size={32} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>Search for people</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.text + '80' }]}>
                    Find friends by searching their name
                  </Text>
                </>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContainer}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Roboto',
    height: '100%',
  },
  clearButton: {
    padding: 8,
  },
  listContainer: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
  },
  userImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 