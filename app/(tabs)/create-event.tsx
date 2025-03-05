import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, Image, Pressable, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as yup from 'yup';
import { addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../../config/firebase';
import { CustomButton } from '../../components/shared/CustomButton';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import MapView, { Marker, Region } from 'react-native-maps';
import { LocationService, UserLocation } from '../../services/location.service';

// Define the schema for validation
const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  date: yup.date().required('Date is required'),
  location: yup.string().required('Location is required'),
  description: yup.string(),
  imageUrl: yup.string(),
});

export default function CreateEventScreen(): React.ReactElement {
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
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const filename = `events/${auth.currentUser?.uid}/${Date.now()}.jpg`;
    const storageRef = ref(storage, filename);
    await uploadBytes(storageRef, blob);
    return getDownloadURL(storageRef);
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
      
      if (!location) {
        Alert.alert('Error', 'Please enter a location name');
        return;
      }

      setIsLoading(true);
      let imageUrl = '';
      
      if (image) {
        imageUrl = await uploadImage(image);
      }

      await schema.validate({ 
        title, 
        date, 
        location, 
        description, 
        imageUrl 
      });
      
      await addDoc(collection(db, 'events'), {
        title,
        date,
        location,
        description,
        imageUrl,
        coordinates: {
          lat: markerCoordinates.latitude,
          lon: markerCoordinates.longitude,
        },
        createdAt: new Date(),
        createdBy: auth.currentUser?.uid,
      });

      router.push('/(tabs)');
    } catch (error) {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TextInput
        style={styles.input}
        placeholder="Event Title"
        value={title}
        onChangeText={setTitle}
      />
      
      <Pressable 
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{format(date, 'PPP')}</Text>
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          value={date}
          mode="date"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setDate(selectedDate);
            }
          }}
        />
      )}


      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
      />

      <Pressable style={styles.imageButton} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.imagePreview} />
        ) : (
          <Text>Add Event Image</Text>
        )}
      </Pressable>

      <View style={styles.locationContainer}>
        <TextInput
          style={styles.input}
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
        />
        <Pressable 
          style={styles.locationButton} 
          onPress={handleRefreshLocation}
          disabled={isLocationLoading}
        >
          <Text>Use Current Location</Text>
        </Pressable>
      </View>

      <View style={styles.mapContainer}>
        {isLocationLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Getting your location...</Text>
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
            <Text>Unable to load map</Text>
          </View>
        )}
        <Text style={styles.mapInstructions}>
          Tap on the map to set location or drag the marker
        </Text>
      </View>

      <CustomButton 
        onPress={handleSubmit}
        title="Create Event"
        loading={isLoading}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationContainer: {
    marginBottom: 8,
  },
  locationButton: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  imageButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  mapContainer: {
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e0e0e0',
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
    marginTop: 10,
    color: '#666',
  },
  mapInstructions: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    padding: 5,
    borderRadius: 4,
    fontSize: 12,
  }
});