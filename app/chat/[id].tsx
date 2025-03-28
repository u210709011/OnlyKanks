import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/theme.context';
import { Message, MessagesService } from '../../services/messages.service';
import { CustomButton } from '../../components/shared/CustomButton';
import { auth } from '../../config/firebase';
import { MessageBubble } from '../../components/chat/MessageBubble';

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flatListRef, setFlatListRef] = useState<FlatList | null>(null);

  useEffect(() => {
    const setupChat = async () => {
      try {
        const unsubscribe = await MessagesService.subscribeToMessages(id as string, (newMessages) => {
          setMessages(newMessages);
        });

        // Mark chat as read when opened
        await MessagesService.markChatAsRead(id as string);

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up chat:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chat');
      }
    };

    setupChat();
  }, [id]);

  const sendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Clear input immediately
    setLoading(true);
    
    try {
      await MessagesService.sendMessage(id as string, messageContent);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageContent); // Restore message if send fails
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        renderItem={({ item }) => (
          <MessageBubble 
            message={item} 
            isOwn={item.senderId === auth.currentUser?.uid}
          />
        )}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        ref={(ref) => {
          if (ref && messages.length > 0) {
            ref.scrollToEnd({ animated: true });
          }
          setFlatListRef(ref);
        }}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef?.scrollToEnd({ animated: true });
          }
        }}
      />
      
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.card, color: theme.text }]}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={theme.text}
          multiline
        />
        <CustomButton
          title="Send"
          onPress={sendMessage}
          loading={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 80,
  },
  messagesList: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 16,
  },
}); 