import { View, Text, StyleSheet, Image, ScrollView, ActivityIndicator, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useState, useEffect } from 'react';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { User, UserService } from '../../services/user.service';
import { Event } from '../../services/events.service';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { EventCard } from '../../components/events/EventCard';
import { auth } from '../../config/firebase';
import { MessagesService } from '../../services/messages.service';
import { CustomButton } from '../../components/shared/CustomButton';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams();
  const { theme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndEvents = async () => {
      try {
        // Fetch user profile
        const userData = await UserService.getUser(id as string);
        if (userData) {
          setUser(userData);
          
          // Fetch user's events
          const eventsRef = collection(db, 'events');
          const q = query(eventsRef, where('createdBy', '==', id));
          const querySnapshot = await getDocs(q);
          const events = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Event[];
          setUserEvents(events);
        } else {
          setError('User not found');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setError('Error loading profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndEvents();
  }, [id]);

  const handleMessage = async () => {
    if (!auth.currentUser || auth.currentUser.uid === id) return;
    
    try {
      // Create or get a chat and navigate to it
      const chatId = await MessagesService.createOrGetChat(id as string);
      router.push(`/chat/${chatId}`);
    } catch (error) {
      console.error('Error creating chat:', error);
      setError('Failed to start chat');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.text} />
      </View>
    );
  }

  if (error || !user) {
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
        }}
      />
      <View style={styles.profileHeader}>
        {user.photoURL ? (
          <Image source={{ uri: user.photoURL }} style={styles.profileImage} />
        ) : (
          <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.border }]}>
            <Ionicons name="person" size={40} color={theme.text} />
          </View>
        )}
        
        <Text style={[styles.displayName, { color: theme.text }]}>
          {user.displayName}
        </Text>
        
        <Text style={[styles.bio, { color: theme.text }]}>
          {user.bio || 'No bio available'}
        </Text>
        
        {/* Add message button if not viewing own profile */}
        {auth.currentUser?.uid !== id && (
          <CustomButton
            title="Send Message"
            onPress={handleMessage}
            style={styles.messageButton}
          />
        )}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Events by {user.displayName}
      </Text>

      {userEvents.length > 0 ? (
        userEvents.map(event => (
          <EventCard key={event.id} event={event} />
        ))
      ) : (
        <Text style={[styles.noEvents, { color: theme.text }]}>
          No events created yet
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  noEvents: {
    textAlign: 'center',
    padding: 20,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    margin: 16,
  },
  messageButton: {
    marginTop: 16,
    width: 200,
    alignSelf: 'center',
  },
}); 