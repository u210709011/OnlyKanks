import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Message } from '../../services/messages.service';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isOwn }) => {
  const { theme } = useTheme();

  // Only show status indicators for own messages
  const renderMessageStatus = () => {
    if (!isOwn) return null;
    
    return (
      <View style={styles.statusContainer}>
        {message.read ? (
          <Ionicons name="checkmark-done" size={14} color="rgba(255,255,255,0.8)" />
        ) : (
          <Ionicons name="checkmark" size={14} color="rgba(255,255,255,0.8)" />
        )}
      </View>
    );
  };

  return (
    <View style={[
      styles.container,
      isOwn ? styles.ownContainer : styles.otherContainer
    ]}>
      <View style={[
        styles.bubble,
        isOwn ? [styles.ownBubble, { backgroundColor: theme.primary }] : [styles.otherBubble, { backgroundColor: theme.card }]
      ]}>
        <Text style={[
          styles.text,
          { color: isOwn ? 'white' : theme.text }
        ]}>
          {message.content} 
        </Text>
        <View style={styles.metaContainer}>
          {renderMessageStatus()}
          <Text style={[
            styles.time,
            { color: isOwn ? 'rgba(255,255,255,0.7)' : theme.text }
          ]}>
            {format(message.createdAt.toDate(), 'HH:mm')}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    maxWidth: '80%',
  },
  ownContainer: {
    alignSelf: 'flex-end',
  },
  otherContainer: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    minWidth: 80,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: 'bold',
    flexWrap: 'wrap',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  statusContainer: {
    marginRight: 4,
  },
  time: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: 'Roboto',
  },
}); 