import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Event, EventsService } from '../../services/events.service';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface EventRequestListItemProps {
  event: Event;
  onPress: () => void;
}

export const EventRequestListItem: React.FC<EventRequestListItemProps> = ({ event, onPress }) => {
  const { theme } = useTheme();
  const requestCount = EventsService.countPendingRequests(event);
  
  // Format the date for display
  const formattedDate = format(
    event.date.toDate ? event.date.toDate() : new Date(event.date),
    'MMM d, yyyy'
  );

  return (
    <Pressable 
      style={[styles.container, { backgroundColor: theme.card }]}
      onPress={onPress}
    >
      {event.imageUrl ? (
        <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]}>
          <Ionicons name="calendar" size={24} color={theme.text} />
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.date, { color: theme.text + 'AA' }]}>
          {formattedDate}
        </Text>
      </View>

      <View style={styles.rightContent}>
        <View style={styles.requestInfo}>
          <View style={[styles.badge, { backgroundColor: theme.primary }]}>
            <Text style={styles.badgeText}>{requestCount}</Text>
          </View>
          <Text style={[styles.requestText, { color: theme.text + '80' }]}>
            Requests
          </Text>
        </View>
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
  eventImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
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
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    opacity: 0.7,
  },
  requestInfo: {
    alignItems: 'center',
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    marginBottom: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestText: {
    fontSize: 12,
  }
}); 