import { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, RefreshControl, Text, SectionList, TouchableOpacity, ScrollView, StyleProp, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { EventCard } from '../../components/events/EventCard';
import { Event, EventsService, EventFilterOptions, AttendeeStatus, ParticipantType } from '../../services/events.service';
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

// Define types for the styles
type AppStyles = {
  container: ViewStyle;
  header: ViewStyle;
  headerTitle: TextStyle;
  messagesButton: ViewStyle;
  centered: ViewStyle;
  emptyContainer: ViewStyle;
  emptyText: TextStyle;
  emptySubtext: TextStyle;
  sectionHeader: ViewStyle;
  sectionHeaderText: TextStyle;
  emptyScrollContainer: ViewStyle;
};

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
    sortBy: 'date-asc',
    categoryId: undefined,
    subCategoryIds: []
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
        case 'upload-date-desc':
          sortedEvents.sort((a, b) => {
            // Use uploadDate if available, otherwise fall back to createdAt
            const dateA = a.uploadDate ? a.uploadDate.toDate().getTime() : a.createdAt.toDate().getTime();
            const dateB = b.uploadDate ? b.uploadDate.toDate().getTime() : b.createdAt.toDate().getTime();
            return dateB - dateA; // Newest first
          });
          break;
        case 'upload-date-asc':
          sortedEvents.sort((a, b) => {
            // Use uploadDate if available, otherwise fall back to createdAt
            const dateA = a.uploadDate ? a.uploadDate.toDate().getTime() : a.createdAt.toDate().getTime();
            const dateB = b.uploadDate ? b.uploadDate.toDate().getTime() : b.createdAt.toDate().getTime();
            return dateA - dateB; // Oldest first
          });
          break;
        case 'capacity-desc':
          sortedEvents.sort((a, b) => {
            // Sort by capacity (largest first)
            // Use infinity for events with no capacity (unlimited)
            const capacityA = a.capacity || Infinity;
            const capacityB = b.capacity || Infinity;
            
            // If both are unlimited (infinity), sort by date
            if (capacityA === Infinity && capacityB === Infinity) {
              return a.date.toDate().getTime() - b.date.toDate().getTime();
            }
            
            // Otherwise, sort by capacity
            return capacityB - capacityA;
          });
          break;
        case 'participants-desc':
          sortedEvents.sort((a, b) => {
            // Count accepted participants for each event
            const acceptedA = (a.participants || []).filter(
              p => (p.status === AttendeeStatus.ACCEPTED || 
                   p.type === ParticipantType.NON_USER || 
                   p.id === a.createdBy) && 
                   p.status !== AttendeeStatus.INVITED
            ).length;
            
            const acceptedB = (b.participants || []).filter(
              p => (p.status === AttendeeStatus.ACCEPTED || 
                   p.type === ParticipantType.NON_USER || 
                   p.id === b.createdBy) && 
                   p.status !== AttendeeStatus.INVITED
            ).length;
            
            // Sort by number of participants (most first)
            return acceptedB - acceptedA;
          });
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
      
      // Only group by date if sorting by date-asc or date-desc
      if (filters.sortBy === 'date-asc' || filters.sortBy === 'date-desc') {
        const grouped = EventsService.groupEventsByDate(sortedEvents);
        
        // For 'date-desc', we need to reverse the grouped array
        // since groupEventsByDate always sorts in ascending order
        if (filters.sortBy === 'date-desc') {
          grouped.reverse();
        }
        
        setGroupedEvents(grouped);
      } else {
        // For other sorting options, put all events in a single "section"
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
        dateRange: appliedFilters.dateRange,
        categoryId: appliedFilters.categoryId,
        subCategoryIds: appliedFilters.subCategoryIds
      };
      
      // Add location filtering if we have coordinates
      if (appliedFilters.locationCoords) {
        filterOptions.latitude = appliedFilters.locationCoords.latitude;
        filterOptions.longitude = appliedFilters.locationCoords.longitude;
        filterOptions.distance = appliedFilters.distance;
      }
      
      const filteredEvents = await EventsService.getFilteredEvents(filterOptions);
      setEvents(filteredEvents);
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
    // If not sorting by event date, show appropriate headers
    if (filters.sortBy === 'distance') {
      return 'Events by distance';
    } else if (filters.sortBy === 'upload-date-desc') {
      return 'Recently Added Events';
    } else if (filters.sortBy === 'upload-date-asc') {
      return 'Events (Oldest Added First)';
    } else if (filters.sortBy === 'capacity-desc') {
      return 'Events by Capacity';
    } else if (filters.sortBy === 'participants-desc') {
      return 'Events by Popularity';
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
        onEventPress={(eventId) => router.push(`/event/${eventId}`)}
      />
      
      {events.length === 0 && !loading ? (
        <ScrollView
          contentContainerStyle={styles.emptyScrollContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.text}
            />
          }
        >
          <View style={[styles.emptyContainer]}>
            <Ionicons name="calendar-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No events found</Text>
            <Text style={[styles.emptySubtext, { color: theme.text + '80' }]}>
              {filters.searchQuery ? 
                "Try different search terms or filters" : 
                "Try changing your location or filters"}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={groupedEvents.map(group => ({
            title: formatSectionDate(group.date),
            data: group.events
          }))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} />}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: theme.background }]}>
              <Text style={[styles.sectionHeaderText, { color: theme.text + '80' }]}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={true}
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

const styles = StyleSheet.create<AppStyles>({
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
  emptyScrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
  }
});
