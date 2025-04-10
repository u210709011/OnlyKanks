import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '../../context/theme.context';
import { Event, EventsService } from '../../services/events.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { EventRequestListItem } from '../../components/events/EventRequestListItem';

export const unstable_settings = {
  // Make event-requests.tsx not show up in the tab bar
  href: null,
};

export default function EventRequestsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);

  const loadEvents = async () => {
    // Prevent duplicate loading
    if (isLoadingRef.current) return;
    
    try {
      isLoadingRef.current = true;
      setLoading(true);
      
      const eventsWithRequests = await EventsService.getEventsWithPendingRequests();
      setEvents(eventsWithRequests);
    } catch (error) {
      console.error('Error loading event requests:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      // Only load if we don't have data yet or it's been more than 30 seconds
      if (events.length === 0 || Date.now() - lastLoadTime.current > 30000) {
        loadEvents();
      }
    }, [])
  );

  // Track last load time
  const lastLoadTime = useRef(Date.now());
  useEffect(() => {
    if (!loading && events.length > 0) {
      lastLoadTime.current = Date.now();
    }
  }, [loading, events]);

  const handleManualRefresh = () => {
    loadEvents();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.background }} />
      
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Event Requests</Text>
        <Pressable 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </Pressable>
      </View>
      
      {events.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: theme.text, fontFamily: 'Roboto' }]}>
            No event requests
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
            Requests to join your events will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={({ item }) => (
            <EventRequestListItem 
              event={item} 
              onPress={() => router.push(`/event/${item.id}`)} 
            />
          )}
          keyExtractor={item => item.id}
          refreshing={loading}
          onRefresh={handleManualRefresh}
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 16,
            flexGrow: events.length === 0 ? 1 : undefined,
            paddingTop: 8
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 