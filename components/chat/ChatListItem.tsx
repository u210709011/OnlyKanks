import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Chat } from '../../services/messages.service';
import { useState, useEffect } from 'react';
import { UserService } from '../../services/user.service';
import { auth } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface ChatListItemProps {
  chat: Chat;
  onPress: () => void;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onPress }) => {
  const { theme } = useTheme();
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    const otherUserId = chat.participants.find(id => id !== auth.currentUser?.uid);
    if (otherUserId) {
      UserService.getUser(otherUserId).then(setOtherUser);
    }
  }, [chat]);

  return (
    <Pressable 
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={onPress}
    >
      {otherUser?.photoURL ? (
        <Image source={{ uri: otherUser.photoURL }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
          <Ionicons name="person" size={24} color={theme.text} />
        </View>
      )}
      
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

        {chat.unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{chat.unreadCount}</Text>
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
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 