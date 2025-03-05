import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    date: string;
    location: string;
  };
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter();

  return (
    <Pressable 
      style={styles.card}
      onPress={() => router.push(`/[event]/${event.id}`)}
    >
      <Text style={styles.title}>{event.title}</Text>
      <Text style={styles.details}>{event.date}</Text>
      <Text style={styles.details}>{event.location}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  details: {
    fontSize: 14,
    color: '#666',
  },
}); 