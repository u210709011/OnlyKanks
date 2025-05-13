import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
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
      console.error('Error subscribing to chats:', error);
      setLoading(false);
      // Fall back to one-time loading if subscription fails
      loadChats();
    });
    
    // Store the unsubscribe function for cleanup
    chatsSubscriptionRef.current = unsubscribe;
    
    return unsubscribe;
  }, []);

  const loadChats = async () => {
    // Prevent duplicate loading
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      // Migrate old chat format to new format
      await MessagesService.migrateChatsToNewFormat().catch(error => {
        console.error('Error migrating chats:', error);
        // Continue even if migration fails
      });
      
      const chatsData = await MessagesService.getChats();
      setChats(chatsData);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  // Set up subscription when component mounts
  useEffect(() => {
    const unsubscribe = subscribeToChats();
    
    // Clean up subscription when component unmounts
    return () => {
      if (chatsSubscriptionRef.current) {
        chatsSubscriptionRef.current();
        chatsSubscriptionRef.current = null;
      }
    };
  }, [subscribeToChats]);

  // When screen gains focus, make sure subscription is active
  useFocusEffect(
    useCallback(() => {
      // If we don't have an active subscription, set one up
      if (!chatsSubscriptionRef.current) {
        subscribeToChats();
      }
      
      return () => {
        // Don't unsubscribe when screen loses focus to keep updates coming
      };
    }, [subscribeToChats])
  );

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
      <View style={{ height: insets.top, backgroundColor: theme.background }} />
      
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Messages</Text>
        <Pressable 
          style={styles.composeButton}
          onPress={() => router.push('/new-message')}
        >
          <Ionicons name="create-outline" size={24} color={theme.primary} />
        </Pressable>
      </View>
      
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