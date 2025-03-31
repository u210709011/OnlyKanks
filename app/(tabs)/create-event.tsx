import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, Image, Pressable, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as yup from 'yup';
import { addDoc, collection } from 'firebase/firestore';
import { db, storage, auth } from '../../config/firebase';
import { CustomButton } from '../../components/shared/CustomButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format, startOfDay } from 'date-fns';
import MapView, { Marker, Region } from 'react-native-maps';
import { LocationService, UserLocation } from '../../services/location.service';
import { CloudinaryService } from '../../services/cloudinary.service';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Define the schema for validation
const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  date: yup.date().required('Date is required'),
  location: yup.string().required('Location is required'),
  description: yup.string(),
  imageUrl: yup.string(),
});

export default function CreateEventScreen(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [location, setLocation] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLocationLoading, setIsLocationLoading] = useState<boolean>(true);
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [markerCoordinates, setMarkerCoordinates] = useState<{latitude: number, longitude: number} | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const today = startOfDay(new Date());

  // Get user's current location on component mount
  useEffect(() => {
    fetchUserLocation();
  }, []);

  const fetchUserLocation = async (): Promise<void> => {
    try {
      setIsLocationLoading(true);
      const currentLocation = await LocationService.getCurrentLocation();
      
      setUserLocation(currentLocation);
      setLocation(currentLocation.address || '');
      
      // Set initial map region
      setMapRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
      
      // Set initial marker position
      setMarkerCoordinates({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
    } catch (error) {
      console.error("Failed to get user location:", error);
      Alert.alert("Location Error", "Failed to get your current location. Please enter a location manually.");
    } finally {
      setIsLocationLoading(false);
    }
  };

  const pickImage = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImagePreview(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<void> => {
    try {
      const url = await CloudinaryService.uploadImage(uri);
      setImageUrl(url);
    } catch (error) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload image');
    }
  };

  const handleMapPress = async (e: any): Promise<void> => {
    const coords = e.nativeEvent.coordinate;
    setMarkerCoordinates(coords);
    
    try {
      const address = await LocationService.getAddressFromCoords(coords.latitude, coords.longitude);
      setLocation(address || '');
    } catch (error) {
      console.error("Error getting address from coordinates:", error);
    }
  };

  const handleMarkerDrag = async (e: any): Promise<void> => {
    const coords = e.nativeEvent.coordinate;
    setMarkerCoordinates(coords);
    
    try {
      const address = await LocationService.getAddressFromCoords(coords.latitude, coords.longitude);
      setLocation(address || '');
    } catch (error) {
      console.error("Error getting address from coordinates:", error);
    }
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      if (!markerCoordinates) {
        Alert.alert('Error', 'Please select a location on the map');
        return;
      }

      setIsLoading(true);
      let finalImageUrl = '';
      
      if (image) {
        try {
          finalImageUrl = await CloudinaryService.uploadImage(image);
          if (!finalImageUrl) {
            throw new Error('Failed to get image URL');
          }
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
      }

      const eventData = {
        title,
        description,
        date: new Date(date),
        location: {
          latitude: markerCoordinates.latitude,
          longitude: markerCoordinates.longitude,
          address: location,
        },
        imageUrl: finalImageUrl,
        createdBy: auth.currentUser?.uid || '',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('Event data being saved:', eventData);
      await addDoc(collection(db, 'events'), eventData);

      router.push('/(tabs)');
    } catch (error) {
      console.error('Submit error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshLocation = (): void => {
    fetchUserLocation();
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      contentContainerStyle={{ 
        paddingTop: insets.top + 12, 
        paddingBottom: insets.bottom + 76, // 60 (tab bar) + 16 (spacing)
        paddingHorizontal: 16 
      }}
    >
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text, fontFamily: 'Roboto' }]}>
          Create Event
        </Text>
      </View>

      <View style={[styles.formContainer, { backgroundColor: theme.card }]}>
        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Event Title</Text>
        <TextInput
          style={[styles.input, { 
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: theme.border,
            fontFamily: 'Roboto'
          }]}
          placeholder="Enter event title"
          placeholderTextColor={theme.text + '40'}
          value={title}
          onChangeText={setTitle}
        />
        
        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Date & Time</Text>
        <Pressable 
          style={[styles.input, { backgroundColor: theme.background }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: theme.text, fontFamily: 'Roboto' }}>
            {date ? format(date, 'PPP') : 'Select Date'}
          </Text>
        </Pressable>

        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            minimumDate={today}
            themeVariant={isDark ? "dark" : "light"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { 
            backgroundColor: theme.background,
            color: theme.text,
            borderColor: theme.border,
            fontFamily: 'Roboto'
          }]}
          placeholder="Enter event description"
          placeholderTextColor={theme.text + '40'}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Event Image</Text>
        <Pressable 
          style={[styles.imageButton, { backgroundColor: theme.background }]} 
          onPress={pickImage}
        >
          {imagePreview ? (
            <View style={styles.imageContainer}>
              <Image 
                source={{ uri: imagePreview }} 
                style={styles.imagePreview} 
              />
              <Pressable 
                style={[styles.removeButton, { backgroundColor: theme.error }]}
                onPress={() => {
                  setImage(null);
                  setImagePreview(null);
                }}
              >
                <Text style={{ color: 'white', fontFamily: 'Roboto' }}>Remove Image</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={32} color={theme.text + '40'} />
              <Text style={{ color: theme.text + '40', fontFamily: 'Roboto', marginTop: 8 }}>Add Event Image</Text>
            </View>
          )}
        </Pressable>

        <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Location</Text>
        <View style={[styles.locationContainer, { backgroundColor: theme.background }]}>
          <TextInput
            style={[styles.locationInput, { 
              color: theme.text,
              fontFamily: 'Roboto'
            }]}
            placeholder="Enter location"
            placeholderTextColor={theme.text + '40'}
            value={location}
            onChangeText={setLocation}
          />
          <CustomButton
            title="Use Current Location"
            onPress={handleRefreshLocation}
            secondary
          />
        </View>

        <View style={styles.mapContainer}>
          {isLocationLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.text + '80', fontFamily: 'Roboto' }]}>Getting your location...</Text>
            </View>
          ) : mapRegion ? (
            <MapView
              style={styles.map}
              initialRegion={mapRegion}
              onPress={handleMapPress}
            >
              {markerCoordinates && (
                <Marker
                  coordinate={markerCoordinates}
                  title={title || "Event location"}
                  draggable
                  onDragEnd={handleMarkerDrag}
                />
              )}
            </MapView>
          ) : (
            <View style={styles.placeholderMap}>
              <Text style={{ color: theme.text + '80', fontFamily: 'Roboto' }}>Unable to load map</Text>
            </View>
          )}
          <Text style={[styles.mapInstructions, { 
            backgroundColor: theme.card + '95',
            color: theme.text,
            fontFamily: 'Roboto'
          }]}>
            Tap on the map to set location or drag the marker
          </Text>
        </View>
      </View>

      <CustomButton
        title="Create Event"
        onPress={handleSubmit}
        loading={isLoading}
        style={styles.submitButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  formContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 24,
    fontSize: 16,
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  locationContainer: {
    marginBottom: 24,
  },
  locationInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  imageButton: {
    height: 200,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButton: {
    position: 'absolute',
    bottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  mapContainer: {
    height: 300,
    marginBottom: 24,
    borderRadius: 8,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  placeholderMap: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
  },
  submitButton: {
    marginTop: 8,
  },
});