import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { Chat, MessagesService } from '../../services/messages.service';
import { UserService } from '../../services/user.service';
import { format } from 'date-fns';
import { ChatListItem } from '../../components/chat/ChatListItem';

export default function MessagesScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);

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

  useFocusEffect(
    useCallback(() => {
      // Only load if we don't have data yet or it's been more than 30 seconds
      if (chats.length === 0 || Date.now() - lastLoadTime.current > 30000) {
        loadChats();
      }
    }, [])
  );

  // Track last load time
  const lastLoadTime = useRef(Date.now());
  useEffect(() => {
    if (!loading && chats.length > 0) {
      lastLoadTime.current = Date.now();
    }
  }, [loading, chats]);

  const handleManualRefresh = () => {
    loadChats();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={chats}
        renderItem={({ item }) => (
          <ChatListItem chat={item} onPress={() => router.push(`/chat/${item.id}`)} />
        )}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={handleManualRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 