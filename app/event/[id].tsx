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
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker } from 'react-native-maps';
import { format, addMinutes, isPast } from 'date-fns';
import { Event, Participant, ParticipantType, AttendeeStatus } from '../../services/events.service';
import { UserService } from '../../services/user.service';
import { useAuth } from '../../context/auth.context';
import { CustomButton } from '../../components/shared/CustomButton';

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

  const acceptedParticipants = event?.participants?.filter(
    p => p.status === AttendeeStatus.ACCEPTED || p.status === AttendeeStatus.INVITED || p.type === ParticipantType.NON_USER || p.id === event?.createdBy
  ) || [];

  useEffect(() => {
    fetchEventData();
  }, [id]);

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
          setIsExpired(isPast(endTime));
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
    const canEdit = isEventCreator && item.type === ParticipantType.NON_USER;
    const isUser = item.type === ParticipantType.USER;
    
    return (
      <View style={[styles.participantItem, { backgroundColor: theme.card }]}>
        <TouchableOpacity 
          style={styles.participantInfo}
          onPress={() => {
            // Only navigate to profile for real users (not for generated test users)
            if (isUser && !item.id.startsWith('friend-') && !item.id.startsWith('non-user-')) {
              router.push(`/profile/${item.id}`);
            }
          }}
          disabled={!isUser || item.id.startsWith('friend-') || item.id.startsWith('non-user-')}
        >
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.participantImage} />
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
    return (
      <View style={[styles.requestItem, { backgroundColor: theme.card }]}>
        <View style={styles.participantInfo}>
          {item.photoURL ? (
            <Image source={{ uri: item.photoURL }} style={styles.participantImage} />
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
        </View>
        
        <View style={styles.requestActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.acceptButton, { backgroundColor: theme.primary }]}
            onPress={() => handleParticipantAction(item, 'accept')}
            disabled={isUpdating}
          >
            <Ionicons name="checkmark" size={18} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.rejectButton, { backgroundColor: theme.error }]}
            onPress={() => handleParticipantAction(item, 'reject')}
            disabled={isUpdating}
          >
            <Ionicons name="close" size={18} color="white" />
          </TouchableOpacity>
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
          <Text style={[styles.title, { color: isExpired ? theme.text + '80' : theme.text }]}>{event.title}</Text>
          
          {/* Creator information */}
          <Pressable 
            style={styles.creatorContainer}
            onPress={() => event.createdBy && router.push(`/profile/${event.createdBy}`)}
          >
            <Image 
              source={creator?.photoURL ? { uri: creator.photoURL } : require('../../assets/default-avatar.png')} 
              style={styles.creatorImage} 
            />
            <Text style={[styles.creatorName, { color: theme.text }]}>
              By {creator?.displayName || 'Unknown User'}
            </Text>
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
                <Text style={[styles.infoText, { color: isExpired ? theme.text + '60' : theme.text }]}>
                  {event.location.address}
                </Text>
                {event.location.details && (
                  <View style={styles.addressDetailsContainer}>
                    {event.location.details.street && (
                      <Text style={[styles.addressDetail, { color: isExpired ? theme.text + '60' : theme.text }]}>
                        {event.location.details.street}
                      </Text>
                    )}
                    <View style={{ flexDirection: 'row' }}>
                      {event.location.details.city && (
                        <Text style={[styles.addressDetail, { color: isExpired ? theme.text + '60' : theme.text }]}>
                          {event.location.details.city}
                          {(event.location.details.state || event.location.details.zip) && ', '}
                        </Text>
                      )}
                      {event.location.details.state && (
                        <Text style={[styles.addressDetail, { color: isExpired ? theme.text + '60' : theme.text }]}>
                          {event.location.details.state} 
                          {event.location.details.zip && ' '}
                        </Text>
                      )}
                      {event.location.details.zip && (
                        <Text style={[styles.addressDetail, { color: isExpired ? theme.text + '60' : theme.text }]}>
                          {event.location.details.zip}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.infoRow}>
              <Ionicons name="people-outline" size={20} color={theme.text} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {acceptedParticipants.length} attending {event.capacity ? `• ${event.capacity} capacity` : ''}
              </Text>
              {event.capacity && acceptedParticipants.length < event.capacity && !isEventCreator && !userParticipant && (
                <TouchableOpacity 
                  style={[styles.joinButton, { backgroundColor: theme.primary }]}
                  onPress={async () => {
                    if (!user) {
                      Alert.alert("Sign In Required", "Please sign in to join events");
                      return;
                    }
                    
                    try {
                      setIsUpdating(true);
                      
                      const newParticipant: Participant = {
                        id: user.id,
                        name: user.displayName || 'Anonymous User',
                        photoURL: user.photoURL || null,
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

          {/* Event description */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
          <Text style={[styles.description, { color: theme.text }]}>
            {event.description || 'No description provided'}
          </Text>

          {/* Participants section */}
          <View style={styles.participantsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Participants ({acceptedParticipants.length}/{event.capacity || 'unlimited'})
              </Text>
              
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
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
    marginTop: 4,
  },
  addressDetail: {
    fontSize: 14,
    fontFamily: 'Roboto',
    lineHeight: 20,
  },
});

