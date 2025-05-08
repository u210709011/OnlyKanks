import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  ScrollView, 
  ActivityIndicator, 
  Pressable, 
  TouchableOpacity, 
  Alert, 
  FlatList, 
  Modal,
  TextInput 
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { format, addMinutes, isPast } from 'date-fns';
import { Event, Participant, ParticipantType, AttendeeStatus } from '../../services/events.service';
import { UserService } from '../../services/user.service';
import { useAuth } from '../../context/auth.context';
import { CustomButton } from '../../components/shared/CustomButton';
import { FriendsService } from '../../services/friends.service';
import { EventsService } from '../../services/events.service';
import EventPhotos from '../../components/EventPhotos';
import EventComments from '../../components/EventComments';
import { CommentService } from '../../services/comment.service';
import UserRating from '../../components/UserRating';

// Define a type for creator data
interface CreatorData {
  displayName: string;
  photoURL?: string | null;
  bio?: string;
}

// Add a helper function to format duration in a user-friendly way
const formatDuration = (minutes: number): string => {
  if (!minutes) return '0 min';
  
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  
  let result = '';
  if (days > 0) result += `${days} day${days > 1 ? 's' : ''} `;
  if (hours > 0) result += `${hours} hr${hours > 1 ? 's' : ''} `;
  if (mins > 0) result += `${mins} min${mins > 1 ? 's' : ''}`;
  
  return result.trim();
};

// Add this function near the top of the file
const isValidImageUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  // Check for common URL patterns and ensure it's not an empty string
  return url.trim().length > 0 && 
         (url.startsWith('http://') || 
          url.startsWith('https://') || 
          url.startsWith('gs://') ||
          url.startsWith('data:image/'));
};

export default function EventScreen() {
  const { id } = useLocalSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();
  const router = useRouter();
  const [creator, setCreator] = useState<CreatorData | null>(null);
  const { user } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [editParticipantName, setEditParticipantName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [userPhotoMap, setUserPhotoMap] = useState<{[key: string]: string | null}>({});
  const [eventRating, setEventRating] = useState<number | null>(null);
  
  // State variables for adding participants
  const [showAddModal, setShowAddModal] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [addParticipantType, setAddParticipantType] = useState<ParticipantType>(ParticipantType.NON_USER);
  
  // Friend-related state variables
  const [friends, setFriends] = useState<any[]>([]);
  const [filteredFriends, setFilteredFriends] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingFriends, setIsLoadingFriends] = useState<boolean>(false);

  // Check if current user is the event creator
  const isEventCreator = user && event && user.id === event.createdBy;

  // Check if current user is a participant
  const userParticipant = user && event?.participants?.find(
    p => p.id === user.id && p.type === ParticipantType.USER
  );

  // Separate participants by status
  const pendingParticipants = event?.participants?.filter(
    p => p.status === AttendeeStatus.PENDING
  ) || [];

  // Modified: Move invited users to a separate array
  const invitedParticipants = event?.participants?.filter(
    p => p.status === AttendeeStatus.INVITED
  ) || [];

  // Updated: Remove invited users from acceptedParticipants
  const acceptedParticipants = event?.participants?.filter(
    p => (p.status === AttendeeStatus.ACCEPTED || p.type === ParticipantType.NON_USER || p.id === event?.createdBy) && 
    p.status !== AttendeeStatus.INVITED
  ) || [];

  useEffect(() => {
    fetchEventData();
  }, [id]);

  // New effect to fetch real user photos for participants
  useEffect(() => {
    if (!event || !event.participants) return;
    
    const fetchUserPhotos = async () => {
      // Only fetch for user participants without photos
      const userIdsToFetch = event.participants!
        .filter(p => p && p.type === ParticipantType.USER && !p.photoURL && !p.id.startsWith('friend-') && !p.id.startsWith('non-user-'))
        .map(p => p.id);
      
      if (userIdsToFetch.length === 0) return;
      
      const photoMap: {[key: string]: string | null} = {};
      
      // Fetch user data to get real photos
      await Promise.all(
        userIdsToFetch.map(async (userId) => {
          try {
            const userData = await UserService.getUser(userId);
            if (userData?.photoURL) {
              photoMap[userId] = userData.photoURL;
              console.log(`Found photo for user ${userId}: ${userData.photoURL}`);
            }
          } catch (error) {
            console.error(`Error fetching photo for user ${userId}:`, error);
          }
        })
      );
      
      setUserPhotoMap(photoMap);
    };
    
    fetchUserPhotos();
  }, [event?.participants]);

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

        // Check if event is expired
        if (eventData.duration) {
          const endTime = addMinutes(eventData.date, eventData.duration);
          const expired = isPast(endTime);
          setIsExpired(expired);
          
          // If event is expired, clean up pending requests and invitations
          if (expired) {
            await EventsService.cleanupExpiredInvitationsAndRequests(eventData.id);
          }
        }

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
        
        // Fetch event rating
        try {
          const avgRating = await CommentService.getAverageRating(eventData.id);
          setEventRating(avgRating);
        } catch (error) {
          console.error('Error fetching event rating:', error);
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

  const handleParticipantAction = async (participant: Participant, action: 'accept' | 'reject' | 'edit') => {
    if (!event) return;
    
    // Prevent actions on expired events
    if (isExpired && action !== 'edit') {
      Alert.alert('Event Ended', 'You cannot modify participants for events that have already ended.');
      return;
    }

    if (action === 'edit') {
      setSelectedParticipant(participant);
      setEditParticipantName(participant.name);
      setShowEditModal(true);
      return;
    }

    try {
      setIsUpdating(true);
      
      const updatedParticipants = [...(event.participants || [])];
      const participantIndex = updatedParticipants.findIndex(
        p => p.id === participant.id && p.type === participant.type
      );
      
      if (participantIndex >= 0) {
        if (action === 'accept') {
          updatedParticipants[participantIndex] = {
            ...updatedParticipants[participantIndex],
            status: AttendeeStatus.ACCEPTED
          };
        } else if (action === 'reject') {
          // Remove from participants list
          updatedParticipants.splice(participantIndex, 1);
        }
      }
      
      await updateDoc(doc(db, 'events', event.id), {
        participants: updatedParticipants
      });
      
      // Update local state
      setEvent({
        ...event,
        participants: updatedParticipants
      });
      
      setShowManageModal(false);
      Alert.alert('Success', `Request ${action === 'accept' ? 'accepted' : 'rejected'}`);
    } catch (error) {
      console.error(`Error ${action}ing participant:`, error);
      Alert.alert('Error', `Failed to ${action} request`);
    } finally {
      setIsUpdating(false);
    }
  };

  const saveParticipantEdit = async () => {
    if (!event || !selectedParticipant) return;
    
    if (!editParticipantName.trim()) {
      Alert.alert('Error', 'Participant name cannot be empty');
      return;
    }
    
    try {
      setIsUpdating(true);
      
      const updatedParticipants = [...(event.participants || [])];
      const participantIndex = updatedParticipants.findIndex(
        p => p.id === selectedParticipant.id && p.type === selectedParticipant.type
      );
      
      if (participantIndex >= 0) {
        updatedParticipants[participantIndex] = {
          ...updatedParticipants[participantIndex],
          name: editParticipantName
        };
        
        await updateDoc(doc(db, 'events', event.id), {
          participants: updatedParticipants
        });
        
        // Update local state
        setEvent({
          ...event,
          participants: updatedParticipants
        });
        
        closeEditModal();
        Alert.alert('Success', 'Participant name updated');
      }
    } catch (error) {
      console.error('Error updating participant name:', error);
      Alert.alert('Error', 'Failed to update participant name');
    } finally {
      setIsUpdating(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedParticipant(null);
    setEditParticipantName('');
  };

  const renderParticipantItem = ({ item }: { item: Participant }) => {
    const isCreator = item.id === event?.createdBy;
    const isUser = item.type === ParticipantType.USER;
    const isRealUser = isUser && !item.id.startsWith('friend-') && !item.id.startsWith('non-user-');
    const canEdit = isEventCreator && !isCreator;
    
    // Get photo from map if available
    const photoURL = item.photoURL || (isRealUser ? userPhotoMap[item.id] : null);
    
    // Debug photoURL
    console.log('Participant data:', JSON.stringify({
      id: item.id,
      name: item.name,
      type: item.type,
      hasPhotoURL: !!item.photoURL,
      photoURL: item.photoURL,
      hasMapPhoto: !!userPhotoMap[item.id],
      mapPhoto: userPhotoMap[item.id],
      finalPhoto: photoURL,
      isValid: isValidImageUrl(photoURL)
    }));
    
    return (
      
      <View style={[styles.participantItem, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.participantInfo}
          onPress={() => {
            // Only navigate to profile for real users
            if (isRealUser) {
              router.push(`/profile/${item.id}`);
            }
          }}
          disabled={!isRealUser}
        >
          
          {isValidImageUrl(photoURL) ? (
            <Image 
              source={{ uri: photoURL as string }} 
              style={styles.participantImage}
              defaultSource={require('../../assets/default-avatar.png')}
            />
          ) : (
            <View style={[styles.participantInitials, { backgroundColor: theme.primary + '20' }]}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View>
            <Text style={[styles.participantName, { color: theme.text }]}>
              {item.name} {isCreator ? '(Creator)' : ''}
            </Text>
            <Text style={[styles.participantType, { color: theme.text + '80' }]}>
              {item.type === ParticipantType.USER ? 'User' : 'Guest'}
            </Text>
          </View>
        </TouchableOpacity>
        
        {canEdit && (
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => handleParticipantAction(item, 'edit')}
          >
            <Ionicons name="pencil" size={18} color={theme.primary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderPendingRequestItem = ({ item }: { item: Participant }) => {
    const isUser = item.type === ParticipantType.USER;
    const isRealUser = isUser && !item.id.startsWith('friend-') && !item.id.startsWith('non-user-');
    
    // Get photo from map if available
    const photoURL = item.photoURL || (isRealUser ? userPhotoMap[item.id] : null);
    
    return (
      <View style={[styles.requestItem, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.participantInfo}
          onPress={() => {
            // Only navigate to profile for real users (not for generated test users)
            if (isRealUser) {
              router.push(`/profile/${item.id}`);
            }
          }}
          disabled={!isRealUser}
        >
          {isValidImageUrl(photoURL) ? (
            <Image 
              source={{ uri: photoURL as string }} 
              style={styles.participantImage}
              defaultSource={require('../../assets/default-avatar.png')}
            />
          ) : (
            <View style={[styles.participantInitials, { backgroundColor: theme.primary + '20' }]}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.participantName, { color: theme.text }]}>
            {item.name}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.acceptButton, 
              { backgroundColor: theme.primary },
              isExpired && { backgroundColor: theme.primary + '60' }
            ]}
            onPress={() => handleParticipantAction(item, 'accept')}
            disabled={isUpdating || isExpired}
          >
            <Ionicons name="checkmark" size={18} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.actionButton, 
              styles.rejectButton, 
              { backgroundColor: theme.error },
              isExpired && { backgroundColor: theme.error + '60' }
            ]}
            onPress={() => handleParticipantAction(item, 'reject')}
            disabled={isUpdating || isExpired}
          >
            <Ionicons name="close" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

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
  
  // Fetch friends when add participant modal shows and User type is selected
  useEffect(() => {
    if (showAddModal && addParticipantType === ParticipantType.USER) {
      fetchFriends();
    }
  }, [showAddModal, addParticipantType]);

  const fetchFriends = async () => {
    if (!user) return;
    
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
        friend => friend && !event?.participants?.some(p => p.id === friend.id)
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
  
  const handleSelectFriend = async (friend: any) => {
    if (!event) return;
    
    try {
      setIsUpdating(true);
      
      // Create participant object for the friend
      const newParticipant: Participant = {
        id: friend.id,
        name: friend.displayName || 'Invited User',
        photoURL: friend.photoURL || null,
        type: ParticipantType.USER,
        status: AttendeeStatus.INVITED
      };
      
      // Check if capacity is reached - include invited participants in the check
      const totalParticipantsCount = acceptedParticipants.length + invitedParticipants.length;
      if (event.capacity && totalParticipantsCount >= event.capacity) {
        Alert.alert('Capacity Limit Reached', 'Cannot add more participants as it would exceed the event capacity.');
        setIsUpdating(false);
        setShowAddModal(false);
        return;
      }
      
      // Update the event with the new participant
      const updatedParticipants = [...(event.participants || []), newParticipant];
      await updateDoc(doc(db, 'events', event.id), {
        participants: updatedParticipants
      });
      
      // Update local state
      setEvent({
        ...event,
        participants: updatedParticipants
      });
      
      setShowAddModal(false);
      Alert.alert('Success', `Invitation sent to ${friend.displayName}`);
    } catch (error) {
      console.error('Error inviting friend:', error);
      Alert.alert('Error', 'Failed to send invitation');
    } finally {
      setIsUpdating(false);
    }
  };

  // New function to handle adding a participant
  const handleAddParticipant = () => {
    // Don't allow adding participants to expired events
    if (isExpired) {
      Alert.alert('Event Ended', 'You cannot add participants to events that have already ended.');
      return;
    }
    
    // Check if we've reached the event capacity
    // Updated to include invited participants in the capacity check
    const totalParticipantsCount = acceptedParticipants.length + invitedParticipants.length;
    if (event?.capacity && totalParticipantsCount >= event.capacity) {
      Alert.alert('Capacity Limit Reached', 'This event has reached its maximum capacity.');
      return;
    }
    
    setParticipantName('');
    setAddParticipantType(ParticipantType.NON_USER);
    setShowAddModal(true);
  };

  // Function to save a new participant
  const handleSaveNewParticipant = async () => {
    if (!event) return;
    
    if (!participantName.trim()) {
      Alert.alert('Error', 'Participant name cannot be empty');
      return;
    }

    // Check if adding a participant would exceed capacity
    // Updated to include invited participants in the capacity check
    const totalParticipantsCount = acceptedParticipants.length + invitedParticipants.length;
    if (event.capacity && totalParticipantsCount >= event.capacity) {
      Alert.alert(
        'Capacity Limit Reached', 
        'Cannot add more participants as it would exceed the event capacity.'
      );
      return;
    }

    try {
      setIsUpdating(true);
      
      let newParticipant: Participant;

      if (addParticipantType === ParticipantType.NON_USER) {
        // Create non-user participant
        newParticipant = {
          id: `non-user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: participantName,
          type: ParticipantType.NON_USER
        };
      } else {
        // Create a user participant with pending status
        newParticipant = {
          id: `friend-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: participantName,
          photoURL: null,
          type: ParticipantType.USER,
          status: AttendeeStatus.INVITED
        };
      }

      // Update the event with the new participant
      const updatedParticipants = [...(event.participants || []), newParticipant];
      await updateDoc(doc(db, 'events', event.id), {
        participants: updatedParticipants
      });
      
      // Update local state
      setEvent({
        ...event,
        participants: updatedParticipants
      });
      
      setShowAddModal(false);
      Alert.alert('Success', 'Participant added successfully');
    } catch (error) {
      console.error('Error adding participant:', error);
      Alert.alert('Error', 'Failed to add participant');
    } finally {
      setIsUpdating(false);
    }
  };

  // Add this function to render event rating
  const renderEventRating = () => {
    if (eventRating === null) return null;
    
    return (
      <View style={styles.eventRatingContainer}>
        <Text style={[styles.ratingNumber, { color: theme.text }]}>
          {eventRating.toFixed(1)}
        </Text>
        <View style={styles.ratingStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={eventRating >= star ? 'star' : eventRating >= star - 0.5 ? 'star-half' : 'star-outline'}
              size={18}
              color={theme.primary}
              style={{ marginHorizontal: 1 }}
            />
          ))}
        </View>
      </View>
    );
  };

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
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <Stack.Screen
          options={{
            headerStyle: { backgroundColor: theme.background },
            headerTintColor: theme.text,
            title: event.title,
          }}
        />

        {event.imageUrl ? (
          <View style={styles.imageWrapper}>
            <Image 
              source={{ uri: event.imageUrl }} 
              style={[styles.image, isExpired && { opacity: 0.7 }]}
              resizeMode="cover"
            />
            {isExpired && (
              <View style={styles.expiredOverlay}>
                <View style={[styles.expiredBadge, { backgroundColor: theme.error }]}>
                  <Text style={styles.expiredText}>Event Ended</Text>
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: theme.card }, isExpired && { opacity: 0.7 }]}>
            <Ionicons name="image-outline" size={48} color={theme.text} />
            {isExpired && (
              <View style={[styles.expiredBadge, { backgroundColor: theme.error, marginTop: 12 }]}>
                <Text style={styles.expiredText}>Event Ended</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: isExpired ? theme.text + '80' : theme.text }]}>
              {event.title}
            </Text>
            {renderEventRating()}
          </View>
          
          {/* Creator information */}
          <Pressable 
            style={styles.creatorContainer}
            onPress={() => event.createdBy && router.push(`/profile/${event.createdBy}`)}
          >
            {creator && isValidImageUrl(creator.photoURL) ? (
              <Image 
                source={{ uri: creator.photoURL as string }} 
                style={styles.creatorImage}
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.creatorInitials, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                  {creator?.displayName ? creator.displayName.substring(0, 2).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={styles.creatorDetails}>
              <Text style={[styles.creatorName, { color: theme.text }]}>
                By {creator?.displayName || 'Unknown User'}
              </Text>
              {event.createdBy && <UserRating userId={event.createdBy} />}
            </View>
          </Pressable>

          {/* Event info */}
          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color={isExpired ? theme.text + '60' : theme.text} />
              <Text style={[styles.infoText, { color: isExpired ? theme.text + '60' : theme.text }]}>
                {format(event.date, 'PPP')} </Text>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color={isExpired ? theme.text + '60' : theme.text} />
              <Text style={[styles.infoText, { color: isExpired ? theme.text + '60' : theme.text }]}>
                {format(event.date, 'h:mm a')} </Text>
            </View>

            {event.duration && (
              <View style={styles.infoRow}>
                <Ionicons name="hourglass-outline" size={20} color={isExpired ? theme.text + '60' : theme.text} />
                <Text style={[styles.infoText, { color: isExpired ? theme.text + '60' : theme.text }]}>
                  {formatDuration(event.duration)}
                  {isExpired && ' (Event has ended)'}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={isExpired ? theme.text + '60' : theme.text} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoText, { color: isExpired ? theme.text + '60' : theme.text }]} numberOfLines={1}>
                  {event.location.address}
                </Text>
                {event.location.details && (
                  <View style={styles.addressDetailsContainer}>
                    <Text 
                      style={[styles.addressDetail, { color: isExpired ? theme.text + '60' : theme.text + '80' }]}
                      numberOfLines={1}
                    >
                      {event.location.details.street ? `${event.location.details.street}, ` : ''}
                      {event.location.details.city ? `${event.location.details.city}, ` : ''}
                      {event.location.details.state || ''} 
                      {event.location.details.zip || ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color={isExpired ? theme.text + '60' : theme.text} />
              <Text style={[styles.infoText, { color: isExpired ? theme.text + '60' : theme.text }]}>
                {acceptedParticipants.length}/{event.capacity || '∞'} participants
                {isEventCreator && invitedParticipants.length > 0 && ` (${invitedParticipants.length} invited)`}
              </Text>
              {event.capacity && 
                // Updated condition to consider total participants (accepted + invited)
                (acceptedParticipants.length + invitedParticipants.length < event.capacity) && 
                !isEventCreator && !userParticipant && !isExpired && (
                <TouchableOpacity 
                  style={[styles.joinButton, { backgroundColor: theme.primary }]}
                  onPress={async () => {
                    if (!user) {
                      Alert.alert("Sign In Required", "Please sign in to join events");
                      return;
                    }
                    
                    try {
                      setIsUpdating(true);
                      
                      // Fetch the latest user data to ensure we have their current photo
                      let photoURL = user.photoURL;
                      try {
                        const userData = await UserService.getUser(user.id);
                        if (userData && userData.photoURL) {
                          photoURL = userData.photoURL;
                        }
                      } catch (error) {
                        console.error("Error fetching updated user photo:", error);
                        // Continue with join request even if we couldn't get the photo
                      }
                      
                      const newParticipant: Participant = {
                        id: user.id,
                        name: user.displayName || 'Anonymous User',
                        photoURL: photoURL || null,
                        type: ParticipantType.USER,
                        status: AttendeeStatus.PENDING
                      };
                    
                      // Update the event with the new participant
                      await updateDoc(doc(db, 'events', event.id), {
                        participants: arrayUnion(newParticipant)
                      });
                    
                      // Refresh the event data
                      await fetchEventData();
                      Alert.alert("Success", "Request to join sent successfully");
                    } catch (error) {
                      console.error('Error requesting to join event:', error);
                      Alert.alert("Error", "Failed to send join request");
                    } finally {
                      setIsUpdating(false);
                    }
                  }}
                >
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Event Details */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
            <Text style={[styles.description, { color: theme.text }]}>{event.description}</Text>
          </View>

          {/* Event Photos */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Photos</Text>
            <EventPhotos 
              eventId={event.id} 
              isParticipant={(userParticipant !== undefined && userParticipant !== null) || isEventCreator === true} 
            />
          </View>

          {/* Comments Section */}
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <EventComments 
              eventId={event.id}
              isParticipant={(userParticipant !== undefined && userParticipant !== null) || isEventCreator === true}
            />
          </View>

          {/* Invited Participants section - only visible to event creator */}
          {isEventCreator && invitedParticipants.length > 0 && (
            <View style={styles.participantsSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Invited ({invitedParticipants.length})
                </Text>
              </View>
              
              <FlatList
                data={invitedParticipants}
                renderItem={({ item }) => (
                  <View style={[styles.participantItem, { backgroundColor: theme.card }]}>
                    <View style={styles.participantInfo}>
                      {isValidImageUrl(item.photoURL) ? (
                        <Image 
                          source={{ uri: item.photoURL as string }} 
                          style={styles.participantImage}
                          defaultSource={require('../../assets/default-avatar.png')}
                        />
                      ) : (
                        <View style={[styles.participantInitials, { backgroundColor: theme.primary + '20' }]}>
                          <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                            {item.name.substring(0, 2).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <View>
                        <Text style={[styles.participantName, { color: theme.text }]}>
                          {item.name}
                        </Text>
                        <Text style={[styles.participantStatus, { color: theme.text + '80' }]}>
                          Waiting for response
                        </Text>
                      </View>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.editButton}
                      onPress={() => {
                        Alert.alert(
                          'Cancel Invitation',
                          `Do you want to cancel the invitation to ${item.name}?`,
                          [
                            { text: 'No', style: 'cancel' },
                            { 
                              text: 'Yes', 
                              style: 'destructive',
                              onPress: async () => {
                                if (!event) return;
                                try {
                                  setIsUpdating(true);
                                  const updatedParticipants = event.participants?.filter(
                                    p => !(p.id === item.id && p.status === AttendeeStatus.INVITED)
                                  ) || [];
                                  
                                  await updateDoc(doc(db, 'events', event.id), {
                                    participants: updatedParticipants
                                  });
                                  
                                  setEvent({
                                    ...event,
                                    participants: updatedParticipants
                                  });
                                  
                                  Alert.alert('Success', 'Invitation canceled');
                                } catch (error) {
                                  console.error('Error canceling invitation:', error);
                                  Alert.alert('Error', 'Failed to cancel invitation');
                                } finally {
                                  setIsUpdating(false);
                                }
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="close-circle" size={22} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(item) => `invited-${item.type}-${item.id}`}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Participants section */}
          <View style={styles.participantsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Participants ({acceptedParticipants.length}/{event.capacity || '∞'})
              </Text>
              
              <View style={{ flexDirection: 'row' }}>
                {isEventCreator && !isExpired && (
                  <TouchableOpacity 
                    style={[styles.addParticipantButton, { backgroundColor: theme.primary, marginRight: pendingParticipants.length > 0 ? 8 : 0 }]}
                    onPress={handleAddParticipant}
                  >
                    <Ionicons name="add" size={16} color="white" style={{ marginRight: 4 }} />
                    <Text style={styles.actionButtonText}>Add</Text>
                  </TouchableOpacity>
                )}
                
                {isEventCreator && pendingParticipants.length > 0 && (
                  <TouchableOpacity 
                    style={[styles.manageButton, { backgroundColor: theme.primary }]}
                    onPress={() => setShowManageModal(true)}
                  >
                    <Text style={styles.manageButtonText}>
                      Requests ({pendingParticipants.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            
            {acceptedParticipants.length > 0 ? (
              <FlatList
                data={acceptedParticipants}
                renderItem={renderParticipantItem}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                scrollEnabled={false}
              />
            ) : (
              <Text style={[styles.emptyStateText, { color: theme.text + '80' }]}>
                No participants yet
              </Text>
            )}
          </View>

          {/* Map location */}
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
          
          {/* Upload date */}
          {event.uploadDate && (
            <Text style={[styles.uploadDate, { color: theme.text + '60' }]}>
              Posted on {format(event.uploadDate.toDate(), 'MMM d, yyyy')}
            </Text>
          )}
          
          {/* Creator actions buttons */}
          {isEventCreator && (
            <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.primary,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={() => router.push(`/edit-event/${id}`)}
              >
                <Ionicons name="create-outline" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Roboto' }}>Edit Event</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: theme.error,
                  padding: 12,
                  borderRadius: 8,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={() => {
                  Alert.alert(
                    'Delete Event',
                    'Are you sure you want to delete this event? This action cannot be undone.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Delete', 
                        style: 'destructive',
                        onPress: async () => {
                          try {
                            // Check if user is event creator
                            if (!user || user.id !== event.createdBy) {
                              Alert.alert("Permission Denied", "Only the event creator can delete this event");
                              return;
                            }
                            
                            setIsUpdating(true);
                            await deleteDoc(doc(db, 'events', event.id));
                            Alert.alert("Success", "Event deleted successfully");
                            router.replace('/');
                          } catch (error) {
                            console.error('Error deleting event:', error);
                            Alert.alert("Error", "Failed to delete event");
                          } finally {
                            setIsUpdating(false);
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={{ color: 'white', fontWeight: 'bold', fontFamily: 'Roboto' }}>Delete Event</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      
      {/* Manage Requests Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showManageModal}
        onRequestClose={() => setShowManageModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Pending Requests
              </Text>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowManageModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            {pendingParticipants.length > 0 ? (
              <FlatList
                data={pendingParticipants}
                renderItem={renderPendingRequestItem}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                contentContainerStyle={styles.requestsList}
              />
            ) : (
              <Text style={[styles.emptyStateText, { color: theme.text + '80' }]}>
                No pending requests
              </Text>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Edit Participant Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showEditModal}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.editModalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Participant
              </Text>
              
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={closeEditModal}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.editForm}>
              <Text style={[styles.editLabel, { color: theme.text }]}>Name</Text>
              <View style={[styles.editInput, { backgroundColor: theme.input, borderColor: theme.border }]}>
                <TextInput
                  style={{ color: theme.text, padding: 12 }}
                  value={editParticipantName}
                  onChangeText={setEditParticipantName}
                  placeholder="Enter participant name"
                  placeholderTextColor={theme.text + '60'}
                />
              </View>
              
              <View style={styles.editActions}>
                <CustomButton
                  title="Cancel"
                  onPress={closeEditModal}
                  secondary
                  style={styles.editActionButton}
                />
                
                <CustomButton
                  title="Save"
                  onPress={saveParticipantEdit}
                  loading={isUpdating}
                  style={styles.editActionButton}
                />
              </View>
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
                style={styles.closeButton}
                onPress={() => setShowAddModal(false)}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.participantTypeSelector}>
              <Text style={[styles.sectionSubtitle, { color: theme.text }]}>
                Participant Type
              </Text>
              <View style={styles.typeSelectorButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: addParticipantType === ParticipantType.NON_USER ? theme.primary : theme.card + '90' }
                  ]}
                  onPress={() => setAddParticipantType(ParticipantType.NON_USER)}
                >
                  <Text style={[
                    styles.typeButtonText, 
                    { color: addParticipantType === ParticipantType.NON_USER ? 'white' : theme.text }
                  ]}>
                    Guest
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    { backgroundColor: addParticipantType === ParticipantType.USER ? theme.primary : theme.card + '90' }
                  ]}
                  onPress={() => setAddParticipantType(ParticipantType.USER)}
                >
                  <Text style={[
                    styles.typeButtonText, 
                    { color: addParticipantType === ParticipantType.USER ? 'white' : theme.text }
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
                    secondary
                    style={{ flex: 1, marginRight: 8 }}
                  />
                  
                  <CustomButton
                    title="Add"
                    onPress={handleSaveNewParticipant}
                    loading={isUpdating}
                    style={{ flex: 1 }}
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
                        {isValidImageUrl(item.photoURL) ? (
                          <Image 
                            source={{ uri: item.photoURL }}
                            style={styles.friendImage}
                            defaultSource={require('../../assets/default-avatar.png')}
                          />
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 300,
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
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 0,
    flex: 1,
    fontFamily: 'Roboto',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creatorImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  infoContainer: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  joinButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    fontFamily: 'Roboto',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    fontFamily: 'Roboto',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  errorText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    fontFamily: 'Roboto',
  },
  participantsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  participantInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  participantType: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
  },
  emptyStateText: {
    textAlign: 'center',
    marginVertical: 16,
    fontFamily: 'Roboto',
  },
  uploadDate: {
    fontSize: 12,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  editModalContent: {
    width: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  closeButton: {
    padding: 4,
  },
  requestsList: {
    padding: 16,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  requestActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  acceptButton: {
    backgroundColor: 'green',
  },
  rejectButton: {
    backgroundColor: 'red',
  },
  editForm: {
    padding: 16,
  },
  editLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  editInput: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  editActionButton: {
    flex: 0.48,
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  expiredBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  addressDetailsContainer: {
    marginTop: 2,
    marginBottom: 4,
  },
  addressDetail: {
    fontSize: 13,
    fontFamily: 'Roboto',
    lineHeight: 18,
  },
  creatorInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addParticipantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 16,
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
  },
  emptyFriendsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyFriendsText: {
    textAlign: 'center',
    fontSize: 16,
    fontStyle: 'italic',
  },
  participantStatus: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: 'Roboto',
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
  },
  eventRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  ratingNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
    fontFamily: 'Roboto',
  },
  ratingStars: {
    flexDirection: 'row',
  },
});

