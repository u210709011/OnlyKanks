import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, Pressable, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTheme } from '../../context/theme.context';
import { Message, MessagesService, Chat } from '../../services/messages.service';
import { CustomButton } from '../../components/shared/CustomButton';
import { auth, db } from '../../config/firebase';
import { MessageBubble } from '../../components/chat/MessageBubble';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { UserService } from '../../services/user.service';
import { doc, getDoc } from 'firebase/firestore';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [chatData, setChatData] = useState<Chat | null>(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [showScrollToUnread, setShowScrollToUnread] = useState(false);
  const [firstUnreadIndex, setFirstUnreadIndex] = useState<number>(-1);
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // Track user presence
  useEffect(() => {
    if (!otherUser) return;
    
    const unsubscribePresence = UserService.subscribeToUserPresence(
      otherUser.id, 
      (online, lastSeenTime) => {
        setIsOnline(online);
        setLastSeen(lastSeenTime || null);
      }
    );

    return () => {
      unsubscribePresence();
    };
  }, [otherUser]);

  // Fetch chat and other user data
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        // Get chat data
        const chatRef = doc(db, 'chats', id as string);
        const chatDoc = await getDoc(chatRef);
        if (!chatDoc.exists()) {
          throw new Error('Chat not found');
        }

        const data = chatDoc.data() as Chat;
        setChatData({
          ...data,
          id: chatDoc.id
        });

        // Get other user data
        const otherUserId = data.participants.find(userId => userId !== auth.currentUser?.uid);
        if (otherUserId) {
          const userData = await UserService.getUser(otherUserId);
          setOtherUser(userData);
        }
      } catch (error) {
        console.error('Error fetching chat data:', error);
        setError('Failed to load chat');
      }
    };

    fetchChatData();
  }, [id]);

  // Subscribe to messages
  useEffect(() => {
    const setupChat = async () => {
      try {
        const unsubscribe = await MessagesService.subscribeToMessages(id as string, (newMessages) => {
          setMessages(newMessages);
          setLoading(false);
        });

        // Mark chat as read when opened
        await MessagesService.markChatAsRead(id as string);

        return () => {
          unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up chat:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chat');
        setLoading(false);
      }
    };

    setupChat();
  }, [id]);

  // Auto-scroll to bottom when messages load initially
  const initialScrollCompleted = useRef(false);
  useEffect(() => {
    if (
      !loading && 
      messages.length > 0 && 
      flatListRef.current && 
      !initialScrollCompleted.current
    ) {
      // Use setTimeout to ensure the FlatList has rendered
      setTimeout(() => {
        try {
          flatListRef.current?.scrollToEnd({ animated: false });
          initialScrollCompleted.current = true;
        } catch (error) {
          console.error('Error scrolling to bottom:', error);
        }
      }, 100);
    }
  }, [loading, messages]);

  // Find first unread message
  useEffect(() => {
    if (messages.length === 0) return;

    const unreadIndex = messages.findIndex(message => 
      !message.read && message.senderId !== auth.currentUser?.uid
    );

    if (unreadIndex !== -1) {
      setFirstUnreadIndex(unreadIndex);
      setHasUnreadMessages(true);
    } else {
      setHasUnreadMessages(false);
    }
  }, [messages]);

  // Group messages by date
  const groupedMessages = useMemo(() => {
    if (!messages.length) return [];

    const groups: { date: Date; messages: Message[] }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: Message[] = [];

    messages.forEach((message: Message) => {
      const messageDate = message.createdAt.toDate();
      const messageDateOnly = new Date(
        messageDate.getFullYear(),
        messageDate.getMonth(),
        messageDate.getDate()
      );

      if (!currentDate || !isSameDay(currentDate, messageDateOnly)) {
        if (currentDate && currentGroup.length) {
          groups.push({
            date: currentDate,
            messages: currentGroup
          });
        }
        currentDate = messageDateOnly;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentDate && currentGroup.length) {
      groups.push({
        date: currentDate,
        messages: currentGroup
      });
    }

    return groups;
  }, [messages]);

  // Format last seen time
  const formatLastSeen = (date: Date) => {
    if (isToday(date)) {
      return `Last seen today at ${format(date, 'HH:mm')}`;
    } else if (isYesterday(date)) {
      return `Last seen yesterday at ${format(date, 'HH:mm')}`;
    } else {
      return `Last seen on ${format(date, 'MMM d')} at ${format(date, 'HH:mm')}`;
    }
  };

  // Format date for message groups
  const formatDate = (date: Date) => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  const scrollToUnreadMessages = () => {
    if (firstUnreadIndex !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ 
        index: firstUnreadIndex, 
        animated: true,
        viewPosition: 0.5 
      });
      setShowScrollToUnread(false);
    }
  };

  const handleScroll = () => {
    // Show the scroll to unread button when user has scrolled away
    if (hasUnreadMessages) {
      setShowScrollToUnread(true);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    setSendingMessage(true);
    
    try {
      await MessagesService.sendMessage(id as string, messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message if send fails
    } finally {
      setSendingMessage(false);
    }
  };

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Error</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
          <CustomButton title="Retry" onPress={() => router.replace(`/chat/${id}`)} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Loading...</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        
        <Pressable
          style={styles.userInfoContainer}
          onPress={() => otherUser?.id && router.push(`/profile/${otherUser.id}`)}
        >
          {otherUser?.photoURL ? (
            <Image source={{ uri: otherUser.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.border }]}>
              <Ionicons name="person" size={24} color={theme.text} />
            </View>
          )}
          
          <Text style={[styles.username, { color: theme.text }]}>
            {otherUser?.displayName || 'Chat'}
          </Text>
        </Pressable>
      </View>
      
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={groupedMessages}
          keyExtractor={(item) => `group-${item.date.toISOString()}`}
          contentContainerStyle={styles.messagesList}
          onScroll={handleScroll}
          onContentSizeChange={() => {
            // When sending a new message, scroll to bottom
            if (sendingMessage) {
              flatListRef.current?.scrollToEnd({ animated: true });
            }
          }}
          renderItem={({ item: group }) => (
            <View>
              <View style={styles.dateHeader}>
                <View style={[styles.dateContainer, { backgroundColor: theme.border }]}>
                  <Text style={[styles.dateText, { color: theme.text }]}>
                    {formatDate(group.date)}
                  </Text>
                </View>
              </View>
              
              {group.messages.map((message: Message) => (
                <MessageBubble 
                  key={message.id}
                  message={message} 
                  isOwn={message.senderId === auth.currentUser?.uid}
                />
              ))}
            </View>
          )}
        />
        
        {showScrollToUnread && hasUnreadMessages && (
          <TouchableOpacity 
            style={[styles.unreadButton, { backgroundColor: theme.primary }]}
            onPress={scrollToUnreadMessages}
          >
            <Ionicons name="arrow-down" size={18} color="white" />
            <Text style={styles.unreadButtonText}>Unread messages</Text>
          </TouchableOpacity>
        )}
        
        <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.background }]}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={theme.text + '80'}
              multiline
            />
            
            <Pressable
              style={[
                styles.sendButton, 
                { 
                  backgroundColor: theme.primary,
                  opacity: !newMessage.trim() ? 0.5 : 1
                }
              ]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="send" size={18} color="white" />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    height: 60,
  },
  backButton: {
    padding: 8,
  },
  userInfoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingTop: 8,
    paddingBottom: 12,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateContainer: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 8,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 2,
    maxHeight: 100,
    minHeight: 36,
    paddingVertical: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadButton: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unreadButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
}); 