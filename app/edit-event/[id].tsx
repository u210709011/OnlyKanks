import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, Image, Text, ScrollView, ActivityIndicator, TouchableOpacity, Platform, Switch, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CustomButton } from '../../components/shared/CustomButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format, startOfDay } from 'date-fns';
import MapView, { Marker, Region } from 'react-native-maps';
import { LocationService } from '../../services/location.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { Event } from '../../services/events.service';
import { useAuth } from '../../context/auth.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper function to check if image URL is valid
const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.trim().length > 0 && 
         (url.startsWith('http://') || 
          url.startsWith('https://') || 
          url.startsWith('gs://') ||
          url.startsWith('data:image/'));
};

export default function EditEventScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // Event data states
  const [event, setEvent] = useState<Event | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState('');
  const [duration, setDuration] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Duration states
  const [durationDays, setDurationDays] = useState('0');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('0');

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  
  // Map states
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [markerCoordinates, setMarkerCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  
  // Address details states
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  
  useEffect(() => {
    fetchEventData();
  }, [id]);
  
  // Calculate total duration in minutes from days, hours, minutes inputs
  useEffect(() => {
    const days = parseInt(durationDays, 10) || 0;
    const hours = parseInt(durationHours, 10) || 0;
    const minutes = parseInt(durationMinutes, 10) || 0;
    
    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
    setDuration(totalMinutes > 0 ? totalMinutes.toString() : '');
  }, [durationDays, durationHours, durationMinutes]);
  
  const fetchEventData = async () => {
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
        
        // Check if current user is the creator
        if (user?.id !== eventData.createdBy) {
          Alert.alert('Permission Denied', 'Only the event creator can edit this event');
          router.back();
          return;
        }
        
        // Populate form fields
        setTitle(eventData.title);
        setDate(eventData.date);
        setDescription(eventData.description || '');
        setLocation(eventData.location.address);
        setCapacity(eventData.capacity?.toString() || '');
        
        // Set duration fields
        if (eventData.duration) {
          const totalMinutes = eventData.duration;
          const days = Math.floor(totalMinutes / (24 * 60));
          const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
          const minutes = totalMinutes % 60;
          
          setDurationDays(days.toString());
          setDurationHours(hours.toString());
          setDurationMinutes(minutes.toString());
          setDuration(totalMinutes.toString());
        }
        
        setImageUrl(eventData.imageUrl || '');
        setImagePreview(eventData.imageUrl || null);
        
        // Set map data
        if (eventData.location) {
          setMarkerCoordinates({
            latitude: eventData.location.latitude,
            longitude: eventData.location.longitude
          });
          
          setMapRegion({
            latitude: eventData.location.latitude,
            longitude: eventData.location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          });
        }
        
        // Set address details if available
        if (eventData.location.details) {
          setShowAddressDetails(true);
          setAddressStreet(eventData.location.details.street || '');
          setAddressCity(eventData.location.details.city || '');
          setAddressState(eventData.location.details.state || '');
          setAddressZip(eventData.location.details.zip || '');
        }
      } else {
        Alert.alert('Error', 'Event not found');
        router.back();
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      Alert.alert('Error', 'Failed to load event details');
      router.back();
    } finally {
      setIsLoading(false);
    }
  };
  
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImagePreview(result.assets[0].uri);
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };
  
  const uploadImage = async (uri: string) => {
    try {
      setIsSubmitting(true);
      const url = await CloudinaryService.uploadImage(uri);
      setImageUrl(url);
      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleMapPress = async (e: any) => {
    const { coordinate } = e.nativeEvent;
    setMarkerCoordinates(coordinate);
    
    try {
      const address = await LocationService.getAddressFromCoords(
        coordinate.latitude,
        coordinate.longitude
      );
      if (address) {
        setLocation(address);
        // Split the address and try to extract components
        const parts = address.split(' ');
        if (parts.length > 2) {
          setAddressStreet(parts.slice(0, parts.length - 2).join(' '));
          setAddressCity(parts[parts.length - 2] || '');
          setAddressState(parts[parts.length - 1] || '');
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };
  
  const handleMarkerDrag = async (e: any) => {
    const { coordinate } = e.nativeEvent;
    setMarkerCoordinates(coordinate);
    
    try {
      const address = await LocationService.getAddressFromCoords(
        coordinate.latitude,
        coordinate.longitude
      );
      if (address) {
        setLocation(address);
        // Split the address and try to extract components
        const parts = address.split(' ');
        if (parts.length > 2) {
          setAddressStreet(parts.slice(0, parts.length - 2).join(' '));
          setAddressCity(parts[parts.length - 2] || '');
          setAddressState(parts[parts.length - 1] || '');
        }
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };
  
  const handleRefreshLocation = async () => {
    try {
      setIsLocationLoading(true);
      const currentLocation = await LocationService.getCurrentLocation();
      
      setLocation(currentLocation.address || '');
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setMarkerCoordinates({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    } catch (error) {
      console.error('Error refreshing location:', error);
      Alert.alert('Error', 'Failed to refresh location');
    } finally {
      setIsLocationLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    if (!event) return;
    
    // Validate form
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter an event title');
      return;
    }
    
    if (!location.trim() || !markerCoordinates) {
      Alert.alert('Error', 'Please select a location on the map');
      return;
    }
    
    if (!duration || parseInt(duration) < 15) {
      Alert.alert('Error', 'Please enter a valid duration (minimum 15 minutes)');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare updated event data
      const updatedEventData = {
        title,
        description,
        date,
        location: {
          latitude: markerCoordinates.latitude,
          longitude: markerCoordinates.longitude,
          address: location,
          details: showAddressDetails ? {
            street: addressStreet,
            city: addressCity,
            state: addressState,
            zip: addressZip,
          } : undefined,
        },
        updatedAt: new Date(),
        ...(imageUrl ? { imageUrl } : {}),
        ...(capacity ? { capacity: parseInt(capacity) } : {}),
        duration: parseInt(duration),
      };
      
      // Update the event in Firestore
      await updateDoc(doc(db, 'events', event.id), updatedEventData);
      
      Alert.alert('Success', 'Event updated successfully');
      
      // Redirect to explore tab
      router.replace('/(tabs)/');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ 
        paddingTop: insets.top + 12, 
        paddingBottom: insets.bottom + 76,
        paddingHorizontal: 16 
      }}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Roboto' }]}>
          Edit Event
        </Text>
      </View>

      <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Event Title *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
          placeholder="Give your event a name"
          placeholderTextColor={theme.text + '60'}
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.dateTimeContainer}>
          <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Event Date</Text>
          <Pressable
            style={[styles.dateInput, { backgroundColor: theme.input }]}
            onPress={() => {
              if (Platform.OS === 'ios') {
                setShowDatePicker(true);
              } else {
                setPickerMode('date');
                setShowDatePicker(true);
              }
            }}
          >
            <Ionicons name="calendar-outline" size={20} color={theme.text + 'BB'} />
            <Text style={[styles.dateText, { color: theme.text }]}>
              {format(date, 'EEEE, MMMM d, yyyy - h:mm a')}
            </Text>
          </Pressable>
        </View>

        {showDatePicker && (
          Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode="datetime"
              display="spinner"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          ) : (
            <DateTimePicker
              value={date}
              mode={pickerMode}
              display="default"
              minimumDate={new Date()}
              onChange={(event, selectedDate) => {
                // For Android, immediately set showDatePicker to false to avoid dismiss error
                setShowDatePicker(false);
                
                if (selectedDate) {
                  if (pickerMode === 'date') {
                    // If we just picked a date, preserve the time from the existing date
                    const hours = date.getHours();
                    const minutes = date.getMinutes();
                    selectedDate.setHours(hours);
                    selectedDate.setMinutes(minutes);
                    setDate(selectedDate);
                    
                    // Now show the time picker
                    setTimeout(() => {
                      setPickerMode('time');
                      setShowDatePicker(true);
                    }, 500);
                  } else {
                    // If we just picked a time, we're done
                    setDate(selectedDate);
                  }
                }
              }}
            />
          )
        )}

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
          Event Duration *
        </Text>
        <View style={styles.durationContainer}>
          <View style={styles.durationRow}>
            <View style={styles.durationField}>
              <TextInput
                style={[styles.durationInput, { backgroundColor: theme.input, color: theme.text }]}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.text + '60'}
                value={durationDays}
                onChangeText={(text) => {
                  // If text is empty, set to '0'
                  if (text.trim() === '') {
                    setDurationDays('0');
                  } 
                  // If text starts with '0' and has more digits, remove the leading zero
                  else if (text.startsWith('0') && text.length > 1) {
                    setDurationDays(text.substring(1));
                  } 
                  // Otherwise use the text as is
                  else {
                    setDurationDays(text);
                  }
                }}
              />
              <Text style={[styles.durationLabel, { color: theme.text }]}>days</Text>
            </View>
            
            <View style={styles.durationField}>
              <TextInput
                style={[styles.durationInput, { backgroundColor: theme.input, color: theme.text }]}
                keyboardType="number-pad"
                placeholder="1"
                placeholderTextColor={theme.text + '60'}
                value={durationHours}
                onChangeText={(text) => {
                  // If text is empty, set to '0'
                  if (text.trim() === '') {
                    setDurationHours('0');
                  } 
                  // If text starts with '0' and has more digits, remove the leading zero
                  else if (text.startsWith('0') && text.length > 1) {
                    setDurationHours(text.substring(1));
                  } 
                  // Otherwise use the text as is
                  else {
                    setDurationHours(text);
                  }
                }}
              />
              <Text style={[styles.durationLabel, { color: theme.text }]}>hours</Text>
            </View>
            
            <View style={styles.durationField}>
              <TextInput
                style={[styles.durationInput, { backgroundColor: theme.input, color: theme.text }]}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={theme.text + '60'}
                value={durationMinutes}
                onChangeText={(text) => {
                  // If text is empty, set to '0'
                  if (text.trim() === '') {
                    setDurationMinutes('0');
                  } 
                  // If text starts with '0' and has more digits, remove the leading zero
                  else if (text.startsWith('0') && text.length > 1) {
                    setDurationMinutes(text.substring(1));
                  } 
                  // Otherwise use the text as is
                  else {
                    setDurationMinutes(text);
                  }
                }}
              />
              <Text style={[styles.durationLabel, { color: theme.text }]}>minutes</Text>
            </View>
          </View>
          
          <Text style={[styles.durationHelp, { color: theme.text + '80' }]}>
            Total duration: {duration ? `${parseInt(duration, 10)} minutes` : 'Not set'}
          </Text>
          
          <View style={styles.durationPresets}>
            <TouchableOpacity
              style={[styles.durationPreset, { backgroundColor: theme.input }]}
              onPress={() => {
                setDurationDays('0');
                setDurationHours('1');
                setDurationMinutes('0');
              }}
            >
              <Text style={[styles.durationPresetText, { color: theme.text }]}>1 hour</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.durationPreset, { backgroundColor: theme.input }]}
              onPress={() => {
                setDurationDays('0');
                setDurationHours('2');
                setDurationMinutes('0');
              }}
            >
              <Text style={[styles.durationPresetText, { color: theme.text }]}>2 hours</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.durationPreset, { backgroundColor: theme.input }]}
              onPress={() => {
                setDurationDays('0');
                setDurationHours('4');
                setDurationMinutes('0');
              }}
            >
              <Text style={[styles.durationPresetText, { color: theme.text }]}>4 hours</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.durationPreset, { backgroundColor: theme.input }]}
              onPress={() => {
                setDurationDays('1');
                setDurationHours('0');
                setDurationMinutes('0');
              }}
            >
              <Text style={[styles.durationPresetText, { color: theme.text }]}>1 day</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.mapSection}>
          <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Event Location *</Text>
          
          {isLocationLoading ? (
            <View style={[styles.map, { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.card + '50' }]}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : (
            <MapView
              style={styles.map}
              region={mapRegion || undefined}
              onPress={handleMapPress}
            >
              {markerCoordinates && (
                <Marker
                  coordinate={markerCoordinates}
                  draggable
                  onDragEnd={handleMarkerDrag}
                />
              )}
            </MapView>
          )}
          
          <TouchableOpacity 
            style={[styles.refreshButton, { backgroundColor: theme.card }]}
            onPress={handleRefreshLocation}
          >
            <Ionicons name="refresh-outline" size={24} color={theme.primary} />
          </TouchableOpacity>
          
          <Text style={[styles.locationHint, { color: theme.text + '80' }]}>
            Tap on the map to set location or drag the marker
          </Text>
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
          placeholder="Address"
          placeholderTextColor={theme.text + '60'}
          value={location}
          onChangeText={setLocation}
        />
        
        <View style={styles.toggleContainer}>
          <Text style={[styles.toggleLabel, { color: theme.text + '80' }]}>Show detailed address</Text>
          <Switch
            value={showAddressDetails}
            onValueChange={setShowAddressDetails}
            trackColor={{ false: theme.background, true: theme.primary + '60' }}
            thumbColor={showAddressDetails ? theme.primary : theme.text + '40'}
          />
        </View>
        
        {showAddressDetails && (
          <View style={styles.addressDetailsContainer}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
              placeholder="Street"
              placeholderTextColor={theme.text + '60'}
              value={addressStreet}
              onChangeText={setAddressStreet}
            />
            
            <View style={styles.addressRow}>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.text, flex: 1, marginRight: 8 }]}
                placeholder="City"
                placeholderTextColor={theme.text + '60'}
                value={addressCity}
                onChangeText={setAddressCity}
              />
              
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.text, flex: 1 }]}
                placeholder="State"
                placeholderTextColor={theme.text + '60'}
                value={addressState}
                onChangeText={setAddressState}
              />
            </View>
            
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, color: theme.text, width: '50%' }]}
              placeholder="ZIP Code"
              placeholderTextColor={theme.text + '60'}
              keyboardType="number-pad"
              value={addressZip}
              onChangeText={setAddressZip}
            />
          </View>
        )}

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
          Event Capacity (min 2 people)
        </Text>
        <View style={styles.capacityContainer}>
          <View style={[styles.capacitySelector, { backgroundColor: theme.input }]}>
            <TouchableOpacity
              style={[styles.capacityOption, { backgroundColor: capacity === '5' ? theme.primary : 'transparent' }]}
              onPress={() => setCapacity('5')}
            >
              <Text style={[styles.capacityText, { color: capacity === '5' ? 'white' : theme.text }]}>5</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.capacityOption, { backgroundColor: capacity === '10' ? theme.primary : 'transparent' }]}
              onPress={() => setCapacity('10')}
            >
              <Text style={[styles.capacityText, { color: capacity === '10' ? 'white' : theme.text }]}>10</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.capacityOption, { backgroundColor: capacity === '20' ? theme.primary : 'transparent' }]}
              onPress={() => setCapacity('20')}
            >
              <Text style={[styles.capacityText, { color: capacity === '20' ? 'white' : theme.text }]}>20</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.capacityOption, { backgroundColor: capacity === '50' ? theme.primary : 'transparent' }]}
              onPress={() => setCapacity('50')}
            >
              <Text style={[styles.capacityText, { color: capacity === '50' ? 'white' : theme.text }]}>50</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.customCapacityContainer}>
            <TextInput
              style={[styles.customCapacityInput, { backgroundColor: theme.input, color: theme.text }]}
              placeholder="Custom"
              placeholderTextColor={theme.text + '60'}
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
            />
            <Text style={[styles.capacityUnit, { color: theme.text }]}>people</Text>
          </View>
        </View>

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto', marginTop: 16 }]}>Description</Text>
        <TextInput
          style={[styles.textArea, { backgroundColor: theme.input, color: theme.text }]}
          placeholder="Event description"
          placeholderTextColor={theme.text + '60'}
          multiline
          value={description}
          onChangeText={setDescription}
          numberOfLines={6}
          textAlignVertical="top"
        />

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Event Image</Text>
        <Pressable style={styles.imageUploadContainer} onPress={pickImage}>
          {imagePreview ? (
            <Image source={{ uri: imagePreview }} style={styles.imagePreview} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: theme.card + '50' }]}>
              <Ionicons name="camera-outline" size={40} color={theme.text + '60'} />
              <Text style={[styles.imagePlaceholderText, { color: theme.text + '60' }]}>Tap to upload image</Text>
            </View>
          )}
        </Pressable>

        <CustomButton
          title="Update Event"
          onPress={handleSubmit}
          disabled={isSubmitting}
          loading={isSubmitting}
          style={{ marginTop: 24 }}
          icon="save-outline"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formContainer: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginVertical: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 120,
  },
  dateTimeContainer: {
    marginBottom: 16,
  },
  dateInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 8,
    fontSize: 16,
  },
  mapSection: {
    marginBottom: 12,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  refreshButton: {
    position: 'absolute',
    top: 48,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  locationHint: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 16,
  },
  addressDetailsContainer: {
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  imageUploadContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    height: 200,
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontSize: 16,
  },
  durationContainer: {
    marginBottom: 16,
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  durationField: {
    flex: 1,
    marginHorizontal: 4,
  },
  durationInput: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  durationLabel: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 14,
  },
  durationHelp: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
  },
  durationPresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  durationPreset: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  durationPresetText: {
    fontWeight: '500',
  },
  capacityContainer: {
    marginBottom: 16,
  },
  capacitySelector: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  capacityOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  capacityText: {
    fontWeight: '500',
  },
  customCapacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customCapacityInput: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  capacityUnit: {
    marginLeft: 8,
    fontSize: 16,
  },
}); 