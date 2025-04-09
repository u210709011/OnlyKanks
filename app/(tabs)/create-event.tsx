import React, { useState, useEffect } from 'react';
import { View, TextInput, StyleSheet, Alert, Image, Pressable, Text, ScrollView, ActivityIndicator, TouchableOpacity, Modal, FlatList, Platform, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import * as yup from 'yup';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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
import { ParticipantType, Participant, AttendeeStatus } from '../../services/events.service';
import { FriendsService, Friend } from '../../services/friends.service';
import { UserService } from '../../services/user.service';
import { EventsService } from '../../services/events.service';

// Define the schema for validation
const schema = yup.object().shape({
  title: yup.string().required('Title is required'),
  date: yup.date().required('Date is required'),
  location: yup.string().required('Location is required'),
  description: yup.string(),
  imageUrl: yup.string(),
  capacity: yup.number().positive('Capacity must be a positive number').min(2, 'Capacity must be at least 2 people').nullable(),
  duration: yup.number().positive('Duration must be a positive number').min(15, 'Duration must be at least 15 minutes').required('Duration is required'),
  addressDetails: yup.object().shape({
    street: yup.string(),
    city: yup.string(),
    state: yup.string(),
    zip: yup.string(),
  }),
});

// Add this interface before the CreateEventScreen function
interface LocationWithDetails {
  latitude: number;
  longitude: number;
  address: string;
  details?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export default function CreateEventScreen(): React.ReactElement {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
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
  
  // Duration states with days, hours, minutes
  const [durationDays, setDurationDays] = useState<string>('0');
  const [durationHours, setDurationHours] = useState<string>('1');
  const [durationMinutes, setDurationMinutes] = useState<string>('0');

  // Address details states
  const [showAddressDetails, setShowAddressDetails] = useState<boolean>(false);
  const [addressStreet, setAddressStreet] = useState<string>('');
  const [addressCity, setAddressCity] = useState<string>('');
  const [addressState, setAddressState] = useState<string>('');
  const [addressZip, setAddressZip] = useState<string>('');

  // New states for capacity and participants
  const [capacity, setCapacity] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantsModal, setShowParticipantsModal] = useState<boolean>(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editParticipantIndex, setEditParticipantIndex] = useState<number>(-1);
  const [participantName, setParticipantName] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addParticipantType, setAddParticipantType] = useState<ParticipantType>(ParticipantType.NON_USER);

  // New state variables for friends list
  const [friends, setFriends] = useState<any[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);

  // Track friends to invite after event creation
  const [friendsToInvite, setFriendsToInvite] = useState<any[]>([]);
  const [friendToInvite, setFriendToInvite] = useState<any | null>(null);

  // Get user's current location on component mount
  useEffect(() => {
    fetchUserLocation();
  }, []);

  // Effect to create default creator participant when component loads
  useEffect(() => {
    // Always add the current user as the first participant and creator if not already added
    if (auth.currentUser && participants.length === 0) {
      const creatorParticipant: Participant = {
        id: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'Event Creator',
        photoURL: auth.currentUser.photoURL || null,
        type: ParticipantType.USER,
      };
      setParticipants([creatorParticipant]);
    }
  }, []);

  // Fetch friends when add participant modal shows and User type is selected
  useEffect(() => {
    if (showAddModal && addParticipantType === ParticipantType.USER) {
      fetchFriends();
    }
  }, [showAddModal, addParticipantType]);
  
  // Filter friends based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredFriends(friends);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = friends.filter(
        friend => friend.displayName.toLowerCase().includes(query)
      );
      setFilteredFriends(filtered);
    }
  }, [searchQuery, friends]);
  
  const fetchFriends = async () => {
    if (!auth.currentUser) return;
    
    try {
      setIsLoadingFriends(true);
      const friendsList = await FriendsService.getFriends();
      
      // Get detailed user info for each friend
      const friendsData = await Promise.all(
        friendsList.map(async (friend) => {
          const userData = await UserService.getUser(friend.friendId);
          return userData;
        })
      );
      
      // Filter out undefined values and already added participants
      const validFriends = friendsData.filter(
        friend => friend && !participants.some(p => p.id === friend.id)
      );
      
      setFriends(validFriends);
      setFilteredFriends(validFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to load friends list');
    } finally {
      setIsLoadingFriends(false);
    }
  };
  
  const handleSelectFriend = (friend: any) => {
    // We'll invite the friend after the event is created
    setFriendToInvite(friend);
    setShowAddModal(false);
  };

  const handleAddParticipant = () => {
    // Check if adding a participant would exceed capacity
    if (capacity && participants.length >= parseInt(capacity, 10)) {
      Alert.alert(
        'Capacity Limit Reached', 
        'Cannot add more participants as it would exceed the event capacity. Please increase the capacity or remove some participants.'
      );
      return;
    }
    
    setParticipantName('');
    setAddParticipantType(ParticipantType.NON_USER);
    setShowAddModal(true);
  };

  const handleSaveNewParticipant = () => {
    if (!participantName.trim()) {
      Alert.alert('Error', 'Participant name cannot be empty');
      return;
    }

    // Check if adding a participant would exceed capacity
    if (capacity && participants.length >= parseInt(capacity, 10)) {
      Alert.alert(
        'Capacity Limit Reached', 
        'Cannot add more participants as it would exceed the event capacity. Please increase the capacity or remove some participants.'
      );
      return;
    }

    let newParticipant: Participant;

    if (addParticipantType === ParticipantType.NON_USER) {
      // Create non-user participant
      newParticipant = {
        id: `non-user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: participantName,
        type: ParticipantType.NON_USER
      };
    } else {
      // In a real app, you'd show a friend picker and set the friend's data
      // For now, let's create a placeholder user participant
      newParticipant = {
        id: `friend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: participantName,
        photoURL: null,
        type: ParticipantType.USER,
        status: AttendeeStatus.PENDING
      };
    }

    setParticipants([...participants, newParticipant]);
    setShowAddModal(false);
  };

  const handleRemoveParticipant = (index: number) => {
    // Don't allow removing the creator (first participant)
    if (index === 0) return;

    const updatedParticipants = [...participants];
    updatedParticipants.splice(index, 1);
    setParticipants(updatedParticipants);
  };

  const handleEditParticipant = (index: number) => {
    const participant = participants[index];
    setEditingParticipant(participant);
    setParticipantName(participant.name);
    setEditParticipantIndex(index);
    setShowParticipantsModal(true);
  };

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

  // Calculate total duration in minutes from days, hours, minutes inputs
  useEffect(() => {
    const days = parseInt(durationDays, 10) || 0;
    const hours = parseInt(durationHours, 10) || 0;
    const minutes = parseInt(durationMinutes, 10) || 0;
    
    const totalMinutes = (days * 24 * 60) + (hours * 60) + minutes;
    setDuration(totalMinutes > 0 ? totalMinutes.toString() : '');
  }, [durationDays, durationHours, durationMinutes]);

  // Add a new function to reset the form
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date());
    setLocation('');
    setCapacity('');
    setDuration('');
    setDurationDays('0');
    setDurationHours('1');
    setDurationMinutes('0');
    setShowAddressDetails(false);
    setAddressStreet('');
    setAddressCity('');
    setAddressState('');
    setAddressZip('');
    setImage(null);
    setImagePreview(null);
    setImageUrl('');
    
    // Reset participants to just the creator
    if (auth.currentUser) {
      const creatorParticipant: Participant = {
        id: auth.currentUser.uid,
        name: auth.currentUser.displayName || 'Event Creator',
        photoURL: auth.currentUser.photoURL || null,
        type: ParticipantType.USER,
      };
      setParticipants([creatorParticipant]);
    } else {
      setParticipants([]);
    }
    
    // Reset friends to invite
    setFriendsToInvite([]);
    
    // Reset location to current user location
    fetchUserLocation();
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      if (!markerCoordinates) {
        Alert.alert('Error', 'Please select a location on the map');
        return;
      }
      
      if (!title.trim()) {
        Alert.alert('Error', 'Title is required');
        return;
      }
      
      if (capacity && parseInt(capacity, 10) <= 1) {
        Alert.alert('Error', 'Capacity must be at least 2 people');
        return;
      }

      if (!duration || parseInt(duration, 10) < 15) {
        Alert.alert('Error', 'Duration must be at least 15 minutes');
        return;
      }

      // Check if participants exceed capacity
      if (capacity && participants.length > parseInt(capacity, 10)) {
        Alert.alert('Error', 'Number of participants cannot exceed capacity');
        return;
      }
      
      // Check if all capacity is already filled
      if (capacity && participants.length === parseInt(capacity, 10)) {
        Alert.alert('Error', 'Cannot publish an event with all capacity already filled. Either increase capacity or remove some participants.');
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

      // Prepare location data with optional address details
      const locationData: LocationWithDetails = {
        latitude: markerCoordinates.latitude,
        longitude: markerCoordinates.longitude,
        address: location,
      };

      // Add address details if provided
      if (showAddressDetails) {
        locationData.details = {
          street: addressStreet,
          city: addressCity,
          state: addressState,
          zip: addressZip
        };
      }

      const eventData = {
        title,
        description,
        date: new Date(date),
        location: locationData,
        imageUrl: finalImageUrl,
        createdBy: auth.currentUser?.uid || '',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadDate: serverTimestamp(), // Add upload date
        capacity: capacity ? parseInt(capacity, 10) : null,
        duration: duration ? parseInt(duration, 10) : null,
        participants: participants
      };

      console.log('Event data being saved:', eventData);
      const eventRef = await addDoc(collection(db, 'events'), eventData);
      
      // After event is created, send invitations to all friends
      if (friendsToInvite.length > 0) {
        const invitePromises = friendsToInvite.map(friend => 
          EventsService.inviteUserToEvent(eventRef.id, friend.id)
        );
        await Promise.all(invitePromises);
      }

      // Reset form after successful submission
      resetForm();
      
      // Show success message
      Alert.alert('Success', 'Event created successfully!', [
        {
          text: 'OK',
          onPress: () => router.push('/(tabs)/profile')
        }
      ]);
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

  // Render a participant item for the list
  const renderParticipantItem = ({ item, index }: { item: Participant, index: number }) => {
    // Don't allow editing the creator
    const isCreator = index === 0 && item.type === ParticipantType.USER;
    const isUser = item.type === ParticipantType.USER;
    
    return (
      <View style={[styles.participantItem, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.participantInfo}
          onPress={() => {
            // Only navigate to profile if it's a user type participant with an actual user ID (not a generated one)
            if (isUser && !item.id.startsWith('friend-')) {
              router.push(`/profile/${item.id}`);
            }
          }}
          disabled={!isUser || item.id.startsWith('friend-')}
        >
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.participantImage} />
          ) : (
            <View style={[styles.defaultAvatar, { backgroundColor: theme.primary + '30' }]}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.participantName, { color: theme.text }]}>
              {item.name} {isCreator ? '(You)' : ''}
            </Text>
            <Text style={[styles.participantType, { color: theme.text + '80' }]}>
              {isUser ? 'User' : 'Guest'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <View style={styles.participantActions}>
          {!isCreator && (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => handleEditParticipant(index)}
              >
                <Ionicons name="pencil" size={18} color={theme.primary} />
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.removeButton}
                onPress={() => handleRemoveParticipant(index)}
              >
                <Ionicons name="trash" size={18} color={theme.error || '#FF3B30'} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  // Add the friend to invite list
  useEffect(() => {
    if (friendToInvite) {
      // Make sure we're not adding duplicates
      if (!friendsToInvite.some(f => f.id === friendToInvite.id)) {
        setFriendsToInvite([...friendsToInvite, friendToInvite]);
      }
      setFriendToInvite(null);
    }
  }, [friendToInvite]);

  // Display the list of friends to be invited
  const renderFriendToInvite = ({ item }: { item: any }) => (
    <View style={[styles.participantItem, { backgroundColor: theme.card }]}>
      <View style={styles.participantInfo}>
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={styles.participantImage} />
        ) : (
          <View style={[styles.defaultAvatar, { backgroundColor: theme.primary + '30' }]}>
            <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
              {item.displayName.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.participantName, { color: theme.text }]}>
            {item.displayName}
          </Text>
          <View style={styles.inviteBadgeContainer}>
            <Ionicons name="mail-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
            <Text style={[styles.participantType, { color: theme.primary }]}>
              Will be invited
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => handleRemoveFriendToInvite(item)}
      >
        <Ionicons name="trash" size={18} color={theme.error || '#FF3B30'} />
      </TouchableOpacity>
    </View>
  );

  const handleRemoveFriendToInvite = (friend: any) => {
    setFriendsToInvite(friendsToInvite.filter(f => f.id !== friend.id));
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
              minimumDate={today}
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
              minimumDate={today}
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
                onChangeText={setDurationDays}
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
                onChangeText={setDurationHours}
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
                onChangeText={setDurationMinutes}
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
                setDurationHours('3');
                setDurationMinutes('0');
              }}
            >
              <Text style={[styles.durationPresetText, { color: theme.text }]}>3 hours</Text>
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

        <View style={styles.participantsSection}>
          <View style={styles.participantsSectionHeader}>
            <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
              Participants ({participants.length}/{capacity ? capacity : '?'})
            </Text>
            <TouchableOpacity 
              style={[styles.addParticipantButton, { backgroundColor: theme.primary }]}
              onPress={handleAddParticipant}
            >
              <Ionicons name="add" size={18} color="white" style={{ marginRight: 4 }} />
              <Text style={styles.addParticipantButtonText}>Add Participant</Text>
            </TouchableOpacity>
          </View>
          
          {participants.length > 0 ? (
            <FlatList
              data={participants}
              renderItem={renderParticipantItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              style={styles.participantsList}
            />
          ) : (
            <Text style={[styles.emptyParticipantsText, { color: theme.text + '60' }]}>
              No participants added yet.
            </Text>
          )}

          {/* Friends to invite section */}
          {friendsToInvite.length > 0 && (
            <>
              <View style={[styles.inviteDivider, { backgroundColor: theme.border }]} />
              
              <View style={styles.participantsSectionHeader}>
                <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
                  Friends to Invite After Event Creation ({friendsToInvite.length})
                </Text>
                <TouchableOpacity
                  style={[{ padding: 8 }]}
                  onPress={() => Alert.alert(
                    "Event Invitations", 
                    "These friends will receive an invitation to your event after creation. They will not be automatically added as participants."
                  )}
                >
                  <Ionicons name="information-circle-outline" size={18} color={theme.text + '80'} />
                </TouchableOpacity>
              </View>
              
              <FlatList
                data={friendsToInvite}
                renderItem={renderFriendToInvite}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                style={styles.participantsList}
              />
            </>
          )}
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
          title="Create Event"
          onPress={handleSubmit}
          disabled={isLoading}
          loading={isLoading}
          style={{ marginTop: 24 }}
        />
      </View>
      
      {/* Edit Participant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showParticipantsModal}
        onRequestClose={() => {
          setShowParticipantsModal(false);
          setEditingParticipant(null);
          setParticipantName('');
          setEditParticipantIndex(-1);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Participant
              </Text>
              
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => {
                  setShowParticipantsModal(false);
                  setEditingParticipant(null);
                  setParticipantName('');
                  setEditParticipantIndex(-1);
                }}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.input, 
                color: theme.text,
                marginVertical: 16
              }]}
              placeholder="Participant name"
              placeholderTextColor={theme.text + '60'}
              value={participantName}
              onChangeText={setParticipantName}
            />
            
            <View style={styles.modalActions}>
              <CustomButton
                title="Cancel"
                onPress={() => {
                  setShowParticipantsModal(false);
                  setEditingParticipant(null);
                  setParticipantName('');
                  setEditParticipantIndex(-1);
                }}
                style={[styles.modalButton, { backgroundColor: theme.background }]}
                textStyle={{ color: theme.text }}
              />
              
              <CustomButton
                title="Save"
                onPress={() => {
                  const updatedParticipants = [...participants];
                  if (editParticipantIndex >= 0) {
                    updatedParticipants[editParticipantIndex] = {
                      ...updatedParticipants[editParticipantIndex],
                      name: participantName
                    };
                  }
                  setParticipants(updatedParticipants);
                  setShowParticipantsModal(false);
                }}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Participant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddModal}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Participant
              </Text>
              
              <TouchableOpacity 
                style={styles.closeModalButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.participantTypeSelector}>
              <Text style={[styles.label, { color: theme.text + '80', fontFamily: 'Roboto' }]}>
                Participant Type
              </Text>
              <View style={styles.typeSelectorButtons}>
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    { 
                      backgroundColor: addParticipantType === ParticipantType.NON_USER 
                        ? theme.primary 
                        : theme.background 
                    }
                  ]}
                  onPress={() => setAddParticipantType(ParticipantType.NON_USER)}
                >
                  <Text style={[
                    styles.typeButtonText, 
                    { 
                      color: addParticipantType === ParticipantType.NON_USER 
                        ? 'white' 
                        : theme.text 
                    }
                  ]}>
                    Guest
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.typeButton, 
                    { 
                      backgroundColor: addParticipantType === ParticipantType.USER 
                        ? theme.primary 
                        : theme.background 
                    }
                  ]}
                  onPress={() => setAddParticipantType(ParticipantType.USER)}
                >
                  <Text style={[
                    styles.typeButtonText, 
                    { 
                      color: addParticipantType === ParticipantType.USER 
                        ? 'white' 
                        : theme.text 
                    }
                  ]}>
                    User
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            {addParticipantType === ParticipantType.NON_USER ? (
              /* Non-user participant form */
              <View>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: theme.input, 
                    color: theme.text,
                    marginVertical: 16
                  }]}
                  placeholder="Participant name"
                  placeholderTextColor={theme.text + '60'}
                  value={participantName}
                  onChangeText={setParticipantName}
                />
                
                <View style={styles.modalActions}>
                  <CustomButton
                    title="Cancel"
                    onPress={() => setShowAddModal(false)}
                    style={[styles.modalButton, { backgroundColor: theme.background }]}
                    textStyle={{ color: theme.text }}
                  />
                  
                  <CustomButton
                    title="Add"
                    onPress={handleSaveNewParticipant}
                    style={styles.modalButton}
                  />
                </View>
              </View>
            ) : (
              /* User participant selection */
              <View style={{ marginTop: 16 }}>
                <View style={[styles.searchContainer, { backgroundColor: theme.input }]}>
                  <Ionicons name="search" size={20} color={theme.text + '60'} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text }]}
                    placeholder="Search friends..."
                    placeholderTextColor={theme.text + '60'}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                
                {isLoadingFriends ? (
                  <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
                ) : filteredFriends.length > 0 ? (
                  <FlatList
                    data={filteredFriends}
                    keyExtractor={(item) => item.id}
                    style={{ maxHeight: 300, marginTop: 16 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[styles.friendItem, { backgroundColor: theme.background }]}
                        onPress={() => handleSelectFriend(item)}
                      >
                        {item.photoURL ? (
                          <Image source={{ uri: item.photoURL }} style={styles.friendImage} />
                        ) : (
                          <View style={[styles.friendImagePlaceholder, { backgroundColor: theme.primary + '30' }]}>
                            <Text style={{ color: theme.primary }}>
                              {item.displayName.substring(0, 2).toUpperCase()}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.friendName, { color: theme.text }]}>
                          {item.displayName}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <View style={styles.emptyFriendsContainer}>
                    <Text style={[styles.emptyFriendsText, { color: theme.text + '80' }]}>
                      {searchQuery ? 'No matching friends found' : 'No friends found'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
  },
  textArea: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontFamily: 'Roboto',
    minHeight: 120,
  },
  imageUploadContainer: {
    marginBottom: 16,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  imagePlaceholderText: {
    marginTop: 8,
    fontFamily: 'Roboto',
  },
  mapSection: {
    position: 'relative',
    marginBottom: 16,
  },
  map: {
    width: '100%',
    height: 250,
    borderRadius: 8,
    marginBottom: 8,
  },
  refreshButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  locationHint: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'Roboto',
    marginBottom: 8,
  },
  participantsSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  participantsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addParticipantButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  emptyParticipantsText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  participantTypeSelector: {
    marginTop: 16,
  },
  typeSelectorButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  typeButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonText: {
    fontWeight: '500',
  },
  participantsList: {
    marginTop: 8,
  },
  participantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  participantImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  defaultAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantName: {
    fontFamily: 'Roboto',
    fontSize: 16,
    fontWeight: '500',
  },
  participantType: {
    fontFamily: 'Roboto',
    fontSize: 14,
    marginTop: 2,
  },
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  removeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  closeModalButton: {
    padding: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 0.48,
  },
  // Friends list styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 4,
    fontFamily: 'Roboto',
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  friendImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  friendImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  friendName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  emptyFriendsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyFriendsText: {
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: 'Roboto',
  },
  inviteDivider: {
    height: 1,
    marginVertical: 12,
  },
  inviteBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
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
    fontFamily: 'Roboto',
    fontSize: 16,
  },
  durationLabel: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  durationHelp: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  addressDetailsContainer: {
    marginBottom: 16,
  },
  addressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    fontFamily: 'Roboto',
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
    fontFamily: 'Roboto',
  },
  capacityUnit: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto',
  },
});