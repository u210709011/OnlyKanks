import { View, Text, StyleSheet, FlatList, Pressable, Image, Button } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { Chat, MessagesService } from '../../services/messages.service';
import { UserService } from '../../services/user.service';
import { format } from 'date-fns';
import { ChatListItem } from '../../components/chat/ChatListItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { collections } from '../../services/firebase.service';
import { AppHeader } from '../../components/shared/AppHeader';
import { eventEmitter } from '../../utils/events';

export const unstable_settings = {
  // Make messages.tsx not show up in the tab bar
  href: null,
};

export default function MessagesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);
  const chatsSubscriptionRef = useRef<(() => void) | null>(null);

  // Subscribe to real-time chat updates
  const subscribeToChats = useCallback(() => {
    if (!auth.currentUser) return;

    // Set up real-time listener for chats
    const chatsRef = collection(db, collections.CHATS);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageDate', 'desc')
    );
    
    setLoading(true);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const updatedChats = snapshot.docs.map(doc => {
        const data = doc.data();
        let unreadCount = 0;
        
        // Get unread count for current user
        if (data.unreadCounts && auth.currentUser && 
            data.unreadCounts[auth.currentUser.uid] !== undefined) {
          unreadCount = data.unreadCounts[auth.currentUser.uid];
        }
        
        return {
          id: doc.id,
          ...data,
          unreadCount,
          unreadCounts: data.unreadCounts || {}
        } as unknown as Chat;
      });
      
      setChats(updatedChats);
      setLoading(false);
    }, (error) => {
      // Silently handle error
      setLoading(false);
      // Fall back to one-time loading if subscription fails
      loadChats();
    });
    
    // Store the unsubscribe function for cleanup
    chatsSubscriptionRef.current = unsubscribe;
    
    // Listen for logout events to clean up
    const handleCleanup = () => {
      if (chatsSubscriptionRef.current) {
        chatsSubscriptionRef.current();
        chatsSubscriptionRef.current = null;
      }
      setChats([]); // Clear chats on logout
    };
    
    eventEmitter.addListener('firebaseCleanup', handleCleanup);
    
    return () => {
      if (chatsSubscriptionRef.current) {
        chatsSubscriptionRef.current();
        chatsSubscriptionRef.current = null;
      }
      eventEmitter.removeAllListeners('firebaseCleanup');
    };
  }, []);

  const loadChats = async () => {
    // Prevent duplicate loading
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Migrate old chat format to new format
      await MessagesService.migrateChatsToNewFormat().catch(() => {
        // Continue even if migration fails
      });
      
      const chatsData = await MessagesService.getChats();
      setChats(chatsData);
    } catch (error) {
      // Silently handle error
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Set up and clean up subscription when the screen is focused/unfocused
  useFocusEffect(
    useCallback(() => {
      // Subscribe when the screen is focused
      const unsubscribe = subscribeToChats();
      
      // Return a cleanup function to run when the screen is unfocused
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }, [subscribeToChats])
  );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (chatsSubscriptionRef.current) {
        chatsSubscriptionRef.current();
        chatsSubscriptionRef.current = null;
      }
    };
  }, []);

  // Track last load time
  const lastLoadTime = useRef(Date.now());
  useEffect(() => {
    if (!loading && chats.length > 0) {
      lastLoadTime.current = Date.now();
    }
  }, [loading, chats]);

  const handleManualRefresh = () => {
    // For manual refresh, unsubscribe and resubscribe
    if (chatsSubscriptionRef.current) {
      chatsSubscriptionRef.current();
      chatsSubscriptionRef.current = null;
    }
    subscribeToChats();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader 
        title="Messages" 
        showBackButton={true}
        rightIcon={{
          name: "create-outline",
          onPress: () => router.push('/new-message')
        }}
      />
      
      {chats.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: theme.text, fontFamily: 'Roboto' }]}>
            No messages yet
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
            Your conversations will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          renderItem={({ item }) => (
            <ChatListItem chat={item} onPress={() => router.push(`/chat/${item.id}`)} />
          )}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={handleManualRefresh}
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 16,
            flexGrow: chats.length === 0 ? 1 : undefined,
            paddingTop: 8
          }}
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
  composeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 