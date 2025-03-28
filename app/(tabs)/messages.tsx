import { View, Text, StyleSheet, FlatList, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
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

  const loadChats = async () => {
    try {
      setLoading(true);
      const chatsData = await MessagesService.getChats();
      setChats(chatsData);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadChats();
    }, [])
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={chats}
        renderItem={({ item }) => (
          <ChatListItem chat={item} onPress={() => router.push(`/chat/${item.id}`)} />
        )}
        keyExtractor={item => item.id}
        refreshing={loading}
        onRefresh={loadChats}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 