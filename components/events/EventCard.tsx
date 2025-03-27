import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Event } from '../../services/events.service';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const router = useRouter();
  const { theme } = useTheme();
  console.log('Type:', typeof event.date);
console.log('Instance of Date:', event.date instanceof Date);
console.log('Raw event.date:', event.date);
console.log('Stringified:', JSON.stringify(event.date, null, 2));

  
  return (
    <Pressable 
      style={[styles.card, { backgroundColor: theme.card }]} 
      onPress={() => router.push(`/event/${event.id}`)}
    >
      {event.imageUrl ? (
        <Image 
          source={{ uri: event.imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.border }]}>
          <Ionicons name="image-outline" size={24} color={theme.text} />
        </View>
      )}
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.text} />
            <Text style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>
            {format(event.date.toDate(), 'MMM d, yyyy')}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={16} color={theme.text} />
            <Text style={[styles.detailText, { color: theme.text }]} numberOfLines={1}>
              {event.location.address}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    height: 100,
  },
  image: {
    width: 100,
    height: '100%',
  },
  imagePlaceholder: {
    width: 100,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  detailsContainer: {
    justifyContent: 'flex-end',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  detailText: {
    fontSize: 14,
    marginLeft: 4,
    opacity: 0.8,
  },
}); 