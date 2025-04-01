import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { format } from 'date-fns';
import { Event } from '../../services/events.service';
import { UserService } from '../../services/user.service';

// Define a type for creator data
interface CreatorData {
  displayName: string;
  photoURL?: string | null;
  bio?: string;
}

export default function EventScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorData | null>(null);

  useEffect(() => {
    const fetchEventAndCreator = async () => {
      try {
        const eventDoc = await getDoc(doc(db, 'events', id as string));
        if (eventDoc.exists()) {
          const data = eventDoc.data();
          const eventData = {
            id: eventDoc.id,
            ...data,
            date: data.date.toDate(),
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
          } as Event;
          setEvent(eventData);

          // Fetch creator information
          const creatorData = await UserService.getUser(eventData.createdBy);
          if (creatorData) {
            setCreator(creatorData);
          } else {
            // Set default creator data if not found
            setCreator({
              displayName: 'Unknown User',
              photoURL: null,
              bio: ''
            });
          }
        } else {
          setError('Event not found');
        }
      } catch (error) {
        console.error('Error fetching event:', error);
        setError('Error loading event');
      } finally {
        setLoading(false);
      }
    };

    fetchEventAndCreator();
  }, [id]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          title: event.title,
        }}
      />

      {event.imageUrl ? (
        <Image 
          source={{ uri: event.imageUrl }} 
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: theme.card }]}>
          <Ionicons name="image-outline" size={48} color={theme.text} />
        </View>
      )}

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>
        
        {/* Creator information */}
        <Pressable 
          style={styles.creatorContainer}
          onPress={() => event.createdBy && router.push(`/profile/${event.createdBy}`)}
        >
          <Image 
            source={creator?.photoURL ? { uri: creator.photoURL } : require('../../assets/default-avatar.png')} 
            style={styles.creatorImage} 
          />
          <Text style={[styles.creatorName, { color: theme.text }]}>
            By {creator?.displayName || 'Unknown User'}
          </Text>
        </Pressable>

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={20} color={theme.text} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            {format(event.date, 'PPP')} </Text>
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={theme.text} />
          <Text style={[styles.infoText, { color: theme.text }]}>
            {event.location.address} </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <Text style={[styles.description, { color: theme.text }]}>
          {event.description || 'No description provided'}
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Location</Text>
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: event.location.latitude,
              longitude: event.location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{
                latitude: event.location.latitude,
                longitude: event.location.longitude,
              }}
              title={event.title}
              description={event.location.address}
            />
          </MapView>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 300,
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginVertical: 16,
  },
  creatorImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  creatorName: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
});
