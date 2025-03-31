import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl, Text, SectionList, TouchableOpacity } from 'react-native';
import { EventCard } from '../../components/events/EventCard';
import { Event, EventsService, EventFilterOptions } from '../../services/events.service';
import { useTheme } from '../../context/theme.context';
import { EventFilters, FilterOptions, SortOption } from '../../components/events/EventFilters';
import { LocationService } from '../../services/location.service';
import { Ionicons } from '@expo/vector-icons';
import { format, isToday, isTomorrow, addDays, isYesterday } from 'date-fns';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

interface EventGroup {
  date: Date;
  events: Event[];
}

export default function ExploreScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Event[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    locationCoords: null,
    distance: 50,
    searchQuery: '',
    dateRange: {
      startDate: null,
      endDate: null
    },
    sortBy: 'date-asc'
  });
  const [filterLoading, setFilterLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Get user location on component mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await LocationService.getCurrentLocation();
        setUserLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
        // Auto-set the location in filters
        setFilters(prev => ({
          ...prev,
          locationCoords: {
            latitude: location.latitude,
            longitude: location.longitude,
          }
        }));
      } catch (error) {
        console.error('Error getting user location:', error);
      }
    };

    getUserLocation();
  }, []);

  // Apply sorting and grouping to events
  useEffect(() => {
    if (events.length) {
      // Sort the events first
      let sortedEvents = [...events];
      
      switch (filters.sortBy) {
        case 'date-asc':
          sortedEvents.sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
          break;
        case 'date-desc':
          sortedEvents.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
          break;
        case 'distance':
          if (filters.locationCoords) {
            sortedEvents.sort((a, b) => {
              const distanceA = EventsService.calculateDistance(
                filters.locationCoords!.latitude,
                filters.locationCoords!.longitude,
                a.location.latitude,
                a.location.longitude
              );
              const distanceB = EventsService.calculateDistance(
                filters.locationCoords!.latitude,
                filters.locationCoords!.longitude,
                b.location.latitude,
                b.location.longitude
              );
              return distanceA - distanceB;
            });
          }
          break;
      }
      
      // Only group by date if sorting by date
      if (filters.sortBy === 'date-asc' || filters.sortBy === 'date-desc') {
        const grouped = EventsService.groupEventsByDate(sortedEvents);
        setGroupedEvents(grouped);
      } else {
        // For distance sorting, put all events in a single "section"
        setGroupedEvents([{ 
          date: new Date(), // Dummy date, won't be displayed
          events: sortedEvents 
        }]);
      }
    } else {
      setGroupedEvents([]);
    }
  }, [events, filters.sortBy, filters.locationCoords]);

  const fetchEvents = async (appliedFilters = filters) => {
    try {
      setLoading(true);
      
      const filterOptions: EventFilterOptions = {
        searchQuery: appliedFilters.searchQuery,
        dateRange: appliedFilters.dateRange
      };
      
      // Add location filtering if we have coordinates
      if (appliedFilters.locationCoords) {
        filterOptions.latitude = appliedFilters.locationCoords.latitude;
        filterOptions.longitude = appliedFilters.locationCoords.longitude;
        filterOptions.distance = appliedFilters.distance;
      }
      
      const eventsData = await EventsService.getFilteredEvents(filterOptions);
      setEvents(eventsData);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setFilterLoading(false);
    }
  };

  const handleFilterChange = async (newFilters: FilterOptions) => {
    setFilters(newFilters);
    setFilterLoading(true);
    await fetchEvents(newFilters);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchEvents();
  }, [filters]);

  useEffect(() => {
    fetchEvents();
  }, []);

  // Format the date headers
  const formatSectionDate = (date: Date): string => {
    // If sorting by distance, don't show date headers
    if (filters.sortBy === 'distance') {
      return '';
    }
    
    if (isToday(date)) {
      return 'Today';
    } else if (isTomorrow(date)) {
      return 'Tomorrow';
    } else {
      return format(date, 'EEEE, MMMM d');
    }
  };

  if (loading && !refreshing && !filterLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with messages button */}
      <View style={[styles.header, { 
        backgroundColor: theme.background,
        paddingTop: insets.top,
        borderBottomColor: theme.border 
      }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Discover
        </Text>
        <TouchableOpacity 
          style={styles.messagesButton}
          onPress={() => router.push('/messages')}
        >
          <Ionicons name="chatbubbles-outline" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      <EventFilters 
        onFilterChange={handleFilterChange} 
        isLoading={filterLoading}
        events={events}
      />
      
      {events.length === 0 && !loading ? (
        <View style={[styles.emptyContainer, { marginTop: 80 }]}>
          <Ionicons name="calendar-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: theme.text }]}>No events found</Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '80' }]}>
            {filters.searchQuery ? 
              "Try different search terms or filters" : 
              "Try changing your location or filters"}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedEvents.map(group => ({
            title: formatSectionDate(group.date),
            data: group.events
          }))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          renderSectionHeader={({ section: { title } }) => (
            title ? (
              <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
                <Text style={[styles.sectionHeaderText, { color: theme.text + '80' }]}>{title}</Text>
              </View>
            ) : null
          )}
          stickySectionHeadersEnabled={filters.sortBy !== 'distance'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.text}
            />
          }
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 76 // 60 (tab bar) + 16 (spacing)
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  messagesButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
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
    fontFamily: 'Roboto',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: '80%',
    fontFamily: 'Roboto',
  },
  sectionHeader: {
    padding: 16,
    paddingLeft: 16,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
