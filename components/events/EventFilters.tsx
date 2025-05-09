import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, TextInput, Switch, Dimensions, TouchableOpacity, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../context/theme.context';
import { LocationService } from '../../services/location.service';
import { CustomButton } from '../shared/CustomButton';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, startOfDay } from 'date-fns';
import { Event } from '../../services/events.service';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

// Non-linear distance mapping
const DISTANCE_RANGES = [
  { label: '500m', value: 0.5 },
  { label: '1km', value: 1 },
  { label: '2km', value: 2 },
  { label: '5km', value: 5 },
  { label: '10km', value: 10 },
  { label: '20km', value: 20 },
  { label: '50km', value: 50 },
  { label: '100km', value: 100 },
  { label: '200km', value: 200 },
  { label: '500km', value: 500 },
  { label: 'Any', value: 1000}
];

// Add sorting options type
export type SortOption = 'date-asc' | 'date-desc' | 'distance' | 'upload-date-desc' | 'upload-date-asc' | 'capacity-desc' | 'participants-desc';

// Update FilterOptions to include sortBy
export interface FilterOptions {
  locationCoords: {
    latitude: number;
    longitude: number;
  } | null;
  distance: number; // in km
  searchQuery: string;
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  sortBy: SortOption;
}

interface EventFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  isLoading?: boolean;
  events?: Event[]; // Now using the imported Event type
  onEventPress?: (eventId: string) => void;
}

export const EventFilters: React.FC<EventFiltersProps> = ({ 
  onFilterChange, 
  isLoading = false,
  events = [],
  onEventPress
}) => {
  const { theme, isDark } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [sliderValue, setSliderValue] = useState(6); // Default to 50km (index 6)
  const [tempSliderValue, setTempSliderValue] = useState(6);
  const [filters, setFilters] = useState<FilterOptions>({
    locationCoords: null,
    distance: 50,
    searchQuery: '',
    dateRange: {
      startDate: null,
      endDate: null,
    },
    sortBy: 'date-asc'
  });
  
  const [userDefaultLocation, setUserDefaultLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Add sort modal state
  const [sortModalVisible, setSortModalVisible] = useState(false);
  
  const today = startOfDay(new Date());

  // Add state for selected event
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  // Get user location
  const getUserLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      const locationCoords = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      
      setUserDefaultLocation(locationCoords);
      
      setFilters(prev => ({
        ...prev,
        locationCoords: prev.locationCoords || locationCoords
      }));
    } catch (error) {
      console.log('Error getting user location:', error);
    }
  };

  // Go to user's current location on the map
  const goToCurrentLocation = async () => {
    try {
      const location = await LocationService.getCurrentLocation();
      const locationCoords = {
        latitude: location.latitude,
        longitude: location.longitude,
      };
      
      // Update filter location
      handleFilterChange('locationCoords', locationCoords);
      
      // Animate map to new location
      mapRef.current?.animateToRegion({
        latitude: locationCoords.latitude,
        longitude: locationCoords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 500);
    } catch (error) {
      Alert.alert('Error', 'Could not access your location');
    }
  };

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
  };

  const handleDateRangeChange = (key: 'startDate' | 'endDate', value: Date | null) => {
    setFilters(prev => ({
      ...prev, 
      dateRange: {
        ...prev.dateRange,
        [key]: value
      }
    }));
  };

  // Convert slider index to distance and vice versa
  const indexToDistance = (index: number): number => {
    return DISTANCE_RANGES[Math.min(Math.max(0, index), DISTANCE_RANGES.length - 1)].value;
  };

  const applyFilters = () => {
    const distance = indexToDistance(sliderValue);
    const filtersToApply = {
      ...filters,
      distance: distance
    };
    onFilterChange(filtersToApply);
    setModalVisible(false);
  };

  const resetDistance = () => {
    const defaultIndex = 6; // 50km
    setSliderValue(defaultIndex);
    setTempSliderValue(defaultIndex);
    handleFilterChange('distance', indexToDistance(defaultIndex));
  };

  const resetDateRange = () => {
    handleFilterChange('dateRange', {
      startDate: null,
      endDate: null,
    });
  };

  const getActiveFilterCount = (): number => {
    let count = 0;
    if (filters.locationCoords) count++;
    if (filters.searchQuery.trim() !== '') count++;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    return count;
  };

  const formatDateString = (date: Date | null): string => {
    if (!date) return 'Select date';
    return format(date, 'MMM d, yyyy');
  };

  // Sort option helper
  const getSortOptionLabel = (option: SortOption): string => {
    switch (option) {
      case 'date-asc':
        return 'Date (Earliest first)';
      case 'date-desc':
        return 'Date (Latest first)';
      case 'distance':
        return 'Distance (Nearest first)';
      case 'upload-date-desc':
        return 'Recently Added';
      case 'upload-date-asc':
        return 'Oldest Added';
      case 'capacity-desc':
        return 'Capacity (Largest first)';
      case 'participants-desc':
        return 'Popularity (Most attendees)';
      default:
        return 'Sort by';
    }
  };

  // Handle event marker press
  const handleEventPress = (event: Event) => {
    setSelectedEvent(event);
  };
  
  // Close event mini card
  const closeEventCard = () => {
    setSelectedEvent(null);
  };

  return (
    <>
      <View style={styles.filterContainer}>
        <View style={[styles.filterBar, { backgroundColor: theme.card + '95' }]}>
          <Pressable 
            style={[styles.filterButton, { backgroundColor: theme.background }]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="options-outline" size={18} color={theme.text} />
            <Text style={[styles.filterButtonText, { color: theme.text }]}>
              {getActiveFilterCount() > 0 ? 
                `Filters (${getActiveFilterCount()})` : 
                'Filters'}
            </Text>
          </Pressable>

          <View style={[styles.searchInputContainer, { backgroundColor: theme.background }]}>
            <Ionicons name="search-outline" size={18} color={theme.text + '80'} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search events..."
              placeholderTextColor={theme.text + '60'}
              value={filters.searchQuery}
              onChangeText={(text) => {
                handleFilterChange('searchQuery', text);
                onFilterChange({ ...filters, searchQuery: text });
              }}
            />
            {filters.searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  handleFilterChange('searchQuery', '');
                  onFilterChange({ ...filters, searchQuery: '' });
                }}
              >
                <Ionicons name="close-circle" size={18} color={theme.text + '80'} />
              </TouchableOpacity>
            )}
          </View>

          <Pressable 
            style={[styles.sortButton, { backgroundColor: theme.background }]}
            onPress={() => setSortModalVisible(true)}
          >
            <Ionicons name="swap-vertical" size={18} color={theme.text} />
            <View style={styles.sortButtonDot}>
              <View 
                style={[
                  styles.sortDot, 
                  { backgroundColor: theme.primary }
                ]} 
              />
            </View>
          </Pressable>
        </View>
      </View>

      {/* Sorting modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={sortModalVisible}
        onRequestClose={() => setSortModalVisible(false)}
      >
        <BlurView 
          intensity={30} 
          tint={isDark ? "dark" : "light"}
          style={styles.sortModalContainer}
        >
          <TouchableOpacity 
            style={styles.sortModalBackdrop}
            activeOpacity={1}
            onPress={() => setSortModalVisible(false)}
          >
            <View 
              style={[styles.sortModalContent, { 
                backgroundColor: theme.card,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
              }]}
              onStartShouldSetResponder={() => true}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <Text style={[styles.sortModalTitle, { color: theme.text }]}>Sort By</Text>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'date-asc' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'date-asc');
                  onFilterChange({ ...filters, sortBy: 'date-asc' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'date-asc' ? theme.primary : theme.text }
                ]}>
                  Date (Earliest first)
                </Text>
                {filters.sortBy === 'date-asc' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'date-desc' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'date-desc');
                  onFilterChange({ ...filters, sortBy: 'date-desc' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'date-desc' ? theme.primary : theme.text }
                ]}>
                  Date (Latest first)
                </Text>
                {filters.sortBy === 'date-desc' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'distance' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'distance');
                  onFilterChange({ ...filters, sortBy: 'distance' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'distance' ? theme.primary : theme.text }
                ]}>
                  Distance (Nearest first)
                </Text>
                {filters.sortBy === 'distance' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'upload-date-desc' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'upload-date-desc');
                  onFilterChange({ ...filters, sortBy: 'upload-date-desc' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'upload-date-desc' ? theme.primary : theme.text }
                ]}>
                  Recently Added
                </Text>
                {filters.sortBy === 'upload-date-desc' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'upload-date-asc' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'upload-date-asc');
                  onFilterChange({ ...filters, sortBy: 'upload-date-asc' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'upload-date-asc' ? theme.primary : theme.text }
                ]}>
                  Oldest Added
                </Text>
                {filters.sortBy === 'upload-date-asc' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'capacity-desc' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'capacity-desc');
                  onFilterChange({ ...filters, sortBy: 'capacity-desc' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'capacity-desc' ? theme.primary : theme.text }
                ]}>
                  Capacity (Largest first)
                </Text>
                {filters.sortBy === 'capacity-desc' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  filters.sortBy === 'participants-desc' && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => {
                  handleFilterChange('sortBy', 'participants-desc');
                  onFilterChange({ ...filters, sortBy: 'participants-desc' });
                  setSortModalVisible(false);
                }}
              >
                <Text style={[
                  styles.sortOptionText, 
                  { color: filters.sortBy === 'participants-desc' ? theme.primary : theme.text }
                ]}>
                  Popularity (Most attendees)
                </Text>
                {filters.sortBy === 'participants-desc' && (
                  <Ionicons name="checkmark" size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </BlurView>
      </Modal>

      {/* Main filter modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.centeredView, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalView, { 
            backgroundColor: theme.background,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Events</Text>
              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: theme.card }]} 
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                  Location
                </Text>
                
                <View style={styles.mapContainer}>
                  {(filters.locationCoords || userDefaultLocation) && (
                    <MapView
                      ref={mapRef}
                      style={styles.map}
                      provider={PROVIDER_GOOGLE}
                      initialRegion={{
                        latitude: filters.locationCoords?.latitude || userDefaultLocation?.latitude || 0,
                        longitude: filters.locationCoords?.longitude || userDefaultLocation?.longitude || 0,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                      }}
                      onPress={(e) => {
                        handleFilterChange('locationCoords', e.nativeEvent.coordinate);
                        // Close event card when clicking elsewhere on map
                        setSelectedEvent(null);
                      }}
                    >
                      {/* Location marker */}
                      {(filters.locationCoords || userDefaultLocation) && (
                        <Marker
                          coordinate={{
                            latitude: filters.locationCoords?.latitude || userDefaultLocation?.latitude || 0,
                            longitude: filters.locationCoords?.longitude || userDefaultLocation?.longitude || 0,
                          }}
                          pinColor="red"
                          draggable
                          onDragEnd={(e) => {
                            handleFilterChange('locationCoords', e.nativeEvent.coordinate);
                          }}
                        />
                      )}
                      
                      {/* Event markers */}
                      {events.map(event => (
                        <Marker
                          key={event.id}
                          coordinate={{
                            latitude: event.location.latitude,
                            longitude: event.location.longitude
                          }}
                          pinColor="green"
                          onPress={() => handleEventPress(event)}
                        />
                      ))}
                    </MapView>
                  )}
                  
                  <TouchableOpacity 
                    style={[styles.locationButton, { backgroundColor: theme.card }]}
                    onPress={goToCurrentLocation}
                  >
                    <Ionicons name="locate" size={22} color={theme.primary} />
                  </TouchableOpacity>
                  
                  {/* Mini event card - moved inside map container */}
                  {selectedEvent && (
                    <View style={[styles.miniEventCard, { backgroundColor: theme.card }]}>
                      <TouchableOpacity style={styles.closeCardButton} onPress={closeEventCard}>
                        <Ionicons name="close" size={18} color={theme.text} />
                      </TouchableOpacity>
                      
                      <View style={styles.miniEventCardContent}>
                        {selectedEvent.imageUrl && (
                          <Image 
                            source={{ uri: selectedEvent.imageUrl }} 
                            style={styles.miniEventImage} 
                            resizeMode="cover"
                          />
                        )}
                        
                        <View style={styles.miniEventInfo}>
                          <Text 
                            style={[styles.miniEventTitle, { color: theme.text }]}
                            numberOfLines={1}
                          >
                            {selectedEvent.title}
                          </Text>
                          
                          <Text 
                            style={[styles.miniEventDate, { color: theme.text + '80' }]}
                          >
                            {format(
                              selectedEvent.date && typeof (selectedEvent.date as any).toDate === 'function' 
                                ? (selectedEvent.date as any).toDate() 
                                : new Date(selectedEvent.date), 
                              'MMM d, yyyy'
                            )}
                          </Text>
                          
                          <CustomButton
                            title="View Details"
                            onPress={() => {
                              // Close all modals and reset states before navigation
                              setSelectedEvent(null);
                              setModalVisible(false);
                              setSortModalVisible(false);
                              if (onEventPress) {
                                onEventPress(selectedEvent.id);
                              }
                            }}
                            style={styles.miniEventButton}
                          />
                        </View>
                      </View>
                    </View>
                  )}
                </View>

                <View style={styles.locationInfo}>
                  <Text style={[styles.locationInfoText, { color: theme.text }]}>
                    {filters.locationCoords || userDefaultLocation
                      ? 'Tap or drag marker to set location' 
                      : 'Loading your location...'}
                  </Text>
                </View>

                <View style={styles.distanceContainer}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                      Distance
                    </Text>
                    <TouchableOpacity onPress={resetDistance} style={styles.resetButton}>
                      <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.selectedDistance, { 
                    color: theme.text, 
                    fontFamily: 'Roboto',
                    textAlign: 'center',
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginVertical: 12
                  }]}>
                    {DISTANCE_RANGES[sliderValue].label}
                  </Text>
                  
                  <View style={styles.sliderContainer}>
                    <Slider
                      style={styles.slider}
                      minimumValue={0}
                      maximumValue={DISTANCE_RANGES.length - 1}
                      step={1}
                      value={tempSliderValue}

                      onSlidingComplete={(value: number) => {
                        const finalValue = Math.round(value);
                        setSliderValue(finalValue);
                        setTempSliderValue(finalValue);
                        
                        const distance = indexToDistance(finalValue);
                        handleFilterChange('distance', distance);
                      }}
                      minimumTrackTintColor={theme.primary}
                      maximumTrackTintColor={theme.border}
                      thumbTintColor={theme.primary}
                      tapToSeek={true}
                    />
                    
                    <View style={styles.marksContainer}>
                      {DISTANCE_RANGES.map((range, index) => (
                        <TouchableOpacity 
                          key={index}
                          style={[
                            styles.sliderMark,
                            sliderValue === index && { 
                              backgroundColor: theme.primary,
                              width: 8,
                              height: 8,
                              borderWidth: 2,
                              borderColor: 'white'
                            }
                          ]}
                          onPress={() => {
                            setSliderValue(index);
                            setTempSliderValue(index);
                            const distance = indexToDistance(index);
                            handleFilterChange('distance', distance);
                          }}
                        />
                      ))}
                    </View>
                  </View>
                  
                

                  <View style={styles.rangeLabelsContainer}>
                    {DISTANCE_RANGES.map((range, index) => {
                      // Only show labels at specific intervals to avoid crowding
                      if (index === 0 || index === 3 || index === 6 || index === DISTANCE_RANGES.length - 1) {
                        return (
                          <Text 
                            key={index} 
                            style={[
                              styles.rangeLabel, 
                              { color: theme.text }
                            ]}
                          >
                            {range.label}
                          </Text>
                        );
                      }
                      return <View key={index} style={{ width: 1 }} />;
                    })}
                  </View>
                </View>
              </View>

              <View style={styles.filterSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.filterSectionTitle, { color: theme.text }]}>
                    Date Range
                  </Text>
                  <TouchableOpacity onPress={resetDateRange} style={styles.resetButton}>
                    <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.datePickerRow}>
                  <Text style={[styles.dateLabel, { color: theme.text }]}>From:</Text>
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: theme.card }]}
                    onPress={() => setShowStartDatePicker(true)}
                  >
                    <Text style={{ color: theme.text }}>
                      {formatDateString(filters.dateRange.startDate)}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.datePickerRow}>
                  <Text style={[styles.dateLabel, { color: theme.text }]}>To:</Text>
                  <Pressable
                    style={[styles.dateButton, { backgroundColor: theme.card }]}
                    onPress={() => setShowEndDatePicker(true)}
                  >
                    <Text style={{ color: theme.text }}>
                      {formatDateString(filters.dateRange.endDate)}
                    </Text>
                  </Pressable>
                </View>

                {showStartDatePicker && (
                  <DateTimePicker
                    value={filters.dateRange.startDate || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={today}
                    maximumDate={filters.dateRange.endDate || undefined}
                    onChange={(event, selectedDate) => {
                      setShowStartDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        handleDateRangeChange('startDate', selectedDate);
                      }
                    }}
                    themeVariant={isDark ? "dark" : "light"}
                  />
                )}

                {showEndDatePicker && (
                  <DateTimePicker
                    value={filters.dateRange.endDate || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={filters.dateRange.startDate || today}
                    onChange={(event, selectedDate) => {
                      setShowEndDatePicker(false);
                      if (event.type === 'set' && selectedDate) {
                        handleDateRangeChange('endDate', selectedDate);
                      }
                    }}
                    themeVariant={isDark ? "dark" : "light"}
                  />
                )}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: theme.border, borderTopWidth: 1 }]}>
              <TouchableOpacity 
                style={[styles.resetAllButton]} 
                onPress={() => {
                  resetDistance();
                  resetDateRange();
                  handleFilterChange('locationCoords', null);
                  onFilterChange({ ...filters, locationCoords: null });
                }}
              >
                <Text style={[styles.resetAllText, { color: theme.error }]}>Reset All</Text>
              </TouchableOpacity>
              
              <CustomButton 
                title="Apply Filters" 
                onPress={applyFilters} 
                style={styles.applyButton}
                loading={isLoading}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  filterContainer: {
    zIndex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  filterButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontFamily: 'Roboto',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    marginLeft: 8,
    padding: 0,
    fontFamily: 'Roboto',
  },
  sortButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 8,
  },
  sortButtonDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sortModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sortModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  sortModalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  sortOptionText: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalView: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  applyButton: {
    minWidth: 120,
  },
  resetAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resetAllText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  filterSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resetButton: {
    padding: 6,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 0,
    fontFamily: 'Roboto',
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Roboto',
    marginBottom: 8,
  },
  selectedDistance: {
    fontFamily: 'Roboto',
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 12,
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  distanceContainer: {
    marginTop: 16,
  },
  distanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderContainer: {
    marginVertical: 8,
    position: 'relative',
  },
  slider: {
    width: '100%',
    height: 40,
    zIndex: 1,
  },
  marksContainer: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: 40,
    paddingHorizontal: 10,
    top: 0,
    zIndex: 0,
  },
  sliderMark: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#999',
  },
  distanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  distanceLabel: {
    fontSize: 12,
    fontFamily: 'Roboto',
    opacity: 0.7,
  },
  rangeLabelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  rangeLabel: {
    fontSize: 10,
    textAlign: 'center',
    width: 40,
  },
  locationButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  locationInfo: {
    alignItems: 'center',
    marginBottom: 8,
  },
  locationInfoText: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: 'Roboto',
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    width: 50,
    fontFamily: 'Roboto',
  },
  dateButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  mapContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  miniEventCard: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeCardButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    zIndex: 1,
    padding: 5,
  },
  miniEventCardContent: {
    flexDirection: 'row',
  },
  miniEventImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  miniEventInfo: {
    flex: 1,
  },
  miniEventTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 2,
    fontFamily: 'Roboto',
  },
  miniEventDate: {
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'Roboto',
  },
  miniEventButton: {
    height: 28,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
}); 