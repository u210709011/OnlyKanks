import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Chat } from '../../services/messages.service';
import { useState, useEffect } from 'react';
import { UserService } from '../../services/user.service';
import { auth } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';

interface ChatListItemProps {
  chat: Chat;
  onPress: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onPress }) => {
  const { theme } = useTheme();
  const [otherUser, setOtherUser] = useState<any>(null);
  const router = useRouter();
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  
  // Calculate unread count for current user
  const unreadCount = auth.currentUser && chat.unreadCounts ? 
    chat.unreadCounts[auth.currentUser.uid] || 0 : 0;

  useEffect(() => {
    const userId = chat.participants.find(id => id !== auth.currentUser?.uid);
    if (userId) {
      setOtherUserId(userId);
      UserService.getUser(userId).then(setOtherUser);
    }
  }, [chat]);

  const handleProfilePress = (e: any) => {
    e.stopPropagation(); // Prevent triggering the chat press
    if (otherUserId) {
      router.push(`/profile/${otherUserId}`);
    }
  };

  return (
    <Pressable 
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={onPress}
    >
      <TouchableOpacity onPress={handleProfilePress}>
        {otherUser?.photoURL ? (
          <Image source={{ uri: otherUser.photoURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
            <Ionicons name="person" size={24} color={theme.text} />
          </View>
        )}
      </TouchableOpacity>
      
      <View style={styles.content}>
        <Text style={[styles.name, { color: theme.text }]}>
          {otherUser?.displayName || 'Loading...'}
        </Text>
        {chat.lastMessage && (
          <Text style={[styles.message, { color: theme.text }]} numberOfLines={1}>
            {chat.lastMessageSenderId === auth.currentUser?.uid ? 'You: ' : ''}
            {chat.lastMessage}
          </Text>
        )}
      </View>

      <View style={styles.rightContent}>
        {chat.lastMessageDate && (
          <Text style={[styles.time, { color: theme.text }]}>
            {format(chat.lastMessageDate.toDate(), 'HH:mm')} </Text>
        )}

        {unreadCount > 0 && (
          <View style={styles.unreadContainer}>
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  rightContent: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    opacity: 0.7,
  },
  time: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 4,
  },
  unreadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 