import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Dimensions, ViewStyle, StyleProp, Pressable, Alert } from 'react-native';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { format, addMinutes, isPast } from 'date-fns';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/auth.context';
import { Event, Participant, ParticipantType, AttendeeStatus } from '../../services/events.service';
import { UserService } from '../../services/user.service';
import { BlurView } from 'expo-blur';

interface EventCardProps {
  event: Event;
  onPress?: () => void;
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

export const EventCard: React.FC<EventCardProps> = ({ event, onPress }) => {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [creator, setCreator] = useState<any>(null);
  const [isPressed, setIsPressed] = useState(false);
  const [isJoinRequested, setIsJoinRequested] = useState(false);
  const [isParticipating, setIsParticipating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [isInvited, setIsInvited] = useState(false);

  useEffect(() => {
    // Check if event is expired (current time is after event time + duration)
    const eventDate = event.date.toDate();
    const endTime = event.duration 
      ? addMinutes(eventDate, event.duration) 
      : null;
    
    if (endTime && isPast(endTime)) {
      setIsExpired(true);
    }

    const fetchCreator = async () => {
      try {
        if (event.createdBy) {
          const creatorData = await UserService.getUser(event.createdBy);
          if (creatorData) {
            setCreator(creatorData);
          } else {
            setCreator({
              id: event.createdBy,
              displayName: 'Unknown User',
              photoURL: null
            });
          }
        }
      } catch (error) {
        console.error('Error fetching creator data:', error);
        setCreator({
          id: event.createdBy,
          displayName: 'Unknown User',
          photoURL: null
        });
      }
    };
    
    if (event.createdBy) {
      fetchCreator();
    }

    // Check if user has already requested to join this event or has been invited
    if (user && event.participants) {
      const userParticipant = event.participants.find(
        p => p.id === user.id && p.type === ParticipantType.USER
      );
      if (userParticipant) {
        if (userParticipant.status === AttendeeStatus.ACCEPTED || 
            userParticipant.status === undefined || // For backward compatibility 
            userParticipant.id === event.createdBy) {
          setIsParticipating(true);
        } else if (userParticipant.status === AttendeeStatus.INVITED) {
          setIsInvited(true);
        } else if (userParticipant.status === AttendeeStatus.PENDING) {
          setIsJoinRequested(true);
        }
      }
    }
  }, [event.createdBy, event.participants, user, event.date, event.duration]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/event/${event.id}`);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase();
  };

  const requestToJoin = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to join events");
      return;
    }

    if (event.createdBy === user.id) {
      Alert.alert("Notice", "You're the creator of this event");
      return;
    }

    // If the user has been invited, accept the invitation
    if (isInvited) {
      await acceptInvitation();
      return;
    }

    try {
      setIsJoining(true);
      
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

      // Update the event document directly with the new participant
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        participants: arrayUnion(newParticipant)
      });

      setIsJoinRequested(true);
      Alert.alert("Success", "Request to join sent successfully");
    } catch (error) {
      console.error('Error requesting to join event:', error);
      Alert.alert("Error", "Failed to send join request");
    } finally {
      setIsJoining(false);
    }
  };

  // Handle accepting an invitation
  const acceptInvitation = async () => {
    if (!user) return;
    
    try {
      setIsJoining(true);
      
      // Get the event
      const eventRef = doc(db, 'events', event.id);
      const eventDoc = await getDoc(eventRef);
      
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data() as Event;
      const participants = eventData.participants || [];
      
      // Find the user's participant entry and update its status
      const updatedParticipants = participants.map(p => {
        if (p.id === user.id && p.status === AttendeeStatus.INVITED) {
          return {
            ...p,
            status: AttendeeStatus.ACCEPTED,
            // Update name and photo from current user if available
            name: user.displayName || p.name,
            photoURL: user.photoURL || p.photoURL
          };
        }
        return p;
      });
      
      // Update the event
      await updateDoc(eventRef, {
        participants: updatedParticipants
      });
      
      setIsInvited(false);
      setIsParticipating(true);
      Alert.alert('Success', 'You have joined the event!');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    } finally {
      setIsJoining(false);
    }
  };

  const eventDate = event.date.toDate();
  const formattedDate = format(eventDate, 'EEE, MMM d');
  const formattedTime = format(eventDate, 'h:mm a');

  // Calculate total attendees and available spots
  const totalAccepted = event.participants 
    ? event.participants.filter(p => p.status === AttendeeStatus.ACCEPTED || p.type === ParticipantType.NON_USER || p.id === event.createdBy).length 
    : 0;
  
  const availableSpots = (event.capacity || 0) - totalAccepted;

  return (
    <Pressable
      style={[
        styles.cardContainer,
        { 
          backgroundColor: theme.card,
          transform: [{ scale: isPressed ? 0.98 : 1 }],
          opacity: isExpired ? 0.7 : 1
        }
      ]}
      onPress={handlePress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
    >
      <View style={styles.imageContainer}>
        {event.imageUrl ? (
          <Image
            source={{ uri: event.imageUrl }}
            style={[styles.image, isExpired && styles.expiredImage]}
            resizeMode="cover"
          />
        ) : (
          <View style={[
            styles.placeholderImage, 
            { backgroundColor: isDark ? theme.background : theme.primary + '15' },
            isExpired && styles.expiredPlaceholder
          ]}>
            <Ionicons name="calendar-outline" size={48} color={isExpired ? theme.text + '80' : theme.primary} />
          </View>
        )}
        
        <LinearGradient
          colors={['transparent', isExpired ? 'rgba(0,0,0,0.9)' : 'rgba(0,0,0,0.8)']}
          style={styles.gradient}
        />
        
        <View style={styles.imageBadges}>
          <View style={[
            styles.dateBadge, 
            { backgroundColor: isExpired ? theme.text + '80' : theme.primary }
          ]}>
            <Text style={styles.dateDay}>
              {format(eventDate, 'd')}
            </Text>
            <Text style={styles.dateMonth}>
              {format(eventDate, 'MMM')}
            </Text>
          </View>
          
          {isInvited && (
            <View style={[styles.invitedBadge, { backgroundColor: theme.primary, marginRight: 8 }]}>
              <Text style={styles.invitedBadgeText}>Invited</Text>
            </View>
          )}
          
          {isExpired && (
            <View style={[styles.expiredBadge, { backgroundColor: theme.error }]}>
              <Text style={styles.expiredText}>Ended</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={[
          styles.title, 
          { color: isExpired ? theme.text + '80' : theme.text }
        ]} numberOfLines={2}>
          {event.title}
        </Text>
        
        <View style={styles.metaInfo}>
          <View style={styles.metaItem}>
            <Ionicons 
              name="time-outline" 
              size={16} 
              color={isExpired ? theme.text + '60' : theme.text + 'BB'} 
            />
            <Text style={[
              styles.metaText, 
              { color: isExpired ? theme.text + '60' : theme.text + 'BB' }
            ]}>
              {formattedTime}
            </Text>
          </View>
          
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={16} color={isExpired ? theme.text + '60' : theme.text + 'BB'} />
            <Text style={[
              styles.metaText, 
              { color: isExpired ? theme.text + '60' : theme.text + 'BB' }
            ]} numberOfLines={1}>
              {typeof event.location === 'string' 
                ? event.location 
                : (event.location?.address || 'Location TBD')}
            </Text>
          </View>
          
          {event.duration && (
            <View style={styles.metaItem}>
              <Ionicons 
                name="hourglass-outline" 
                size={16} 
                color={isExpired ? theme.text + '60' : theme.text + 'BB'} 
              />
              <Text style={[
                styles.metaText, 
                { color: isExpired ? theme.text + '60' : theme.text + 'BB' }
              ]}>
                {formatDuration(event.duration)}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[
          styles.description, 
          { color: isExpired ? theme.text + '60' : theme.text + '99' }
        ]} numberOfLines={2}>
          {event.description}
        </Text>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.creatorContainer}
            onPress={() => creator?.id && router.push(`/profile/${creator.id}`)}
          >
            {isValidImageUrl(creator?.photoURL) ? (
              <Image 
                source={{ uri: creator!.photoURL as string }} 
                style={styles.creatorImage} 
                defaultSource={require('../../assets/default-avatar.png')}
              />
            ) : (
              <View style={[styles.creatorInitials, { backgroundColor: theme.primary + '20' }]}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                  {creator?.displayName ? getInitials(creator.displayName) : '?'}
                </Text>
              </View>
            )}
            <Text style={[styles.creatorName, { color: theme.text }]}>
              {creator?.displayName || 'Unknown User'}
            </Text>
          </TouchableOpacity>
          
          <View style={styles.eventInfoContainer}>
            <View style={[styles.attendeeChip, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="people-outline" size={14} color={theme.primary} style={{ marginRight: 4 }} />
              <Text style={[styles.attendeeText, { color: theme.primary }]}>
                {totalAccepted} attending
              </Text>
            </View>
            
            {user && user.id !== event.createdBy && (
              <TouchableOpacity 
                style={[
                  styles.joinButton, 
                  { 
                    backgroundColor: isParticipating 
                      ? theme.primary 
                      : isJoinRequested 
                        ? theme.primary + '30' 
                        : isInvited
                          ? theme.primary
                          : theme.primary,
                    display: isExpired ? 'none' : 'flex'
                  }
                ]}
                onPress={requestToJoin}
                disabled={isParticipating || (isJoinRequested && !isInvited) || isJoining || isExpired}
              >
                <Text style={[
                  styles.joinButtonText, 
                  { 
                    color: isJoinRequested && !isInvited ? theme.primary : 'white'
                  }
                ]}>
                  {isJoining ? 'Sending...' : (
                    isParticipating ? 'Participating' :
                    isInvited ? 'Join' :
                    isJoinRequested ? 'Requested' : 'Join'
                  )}
                </Text>
              </TouchableOpacity>
            )}
            
            {availableSpots > 0 && (
              <Text style={[styles.availableSpots, { color: theme.text + '80' }]}>
                {availableSpots} spot{availableSpots !== 1 ? 's' : ''} left
              </Text>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  imageContainer: {
    height: 180,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  imageBadges: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
  },
  dateBadge: {
    width: 54,
    height: 54,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  dateDay: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  dateMonth: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Roboto',
    textTransform: 'uppercase',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: 'Roboto',
  },
  metaInfo: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 4,
    fontFamily: 'Roboto',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  creatorInitials: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  creatorName: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  eventInfoContainer: {
    alignItems: 'flex-end',
  },
  attendeeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    marginBottom: 6,
  },
  attendeeText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  joinButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  joinButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Roboto',
  },
  availableSpots: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  expiredImage: {
    opacity: 0.6,
  },
  expiredPlaceholder: {
    opacity: 0.7,
  },
  expiredBadge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  invitedBadge: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitedBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
}); 