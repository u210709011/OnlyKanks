import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Pressable, ActivityIndicator, FlatList, Dimensions, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/theme.context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, getDoc, doc, updateDoc } from 'firebase/firestore';
import { Event, EventsService, AttendeeStatus, ParticipantType } from '../../services/events.service';
import { UserService } from '../../services/user.service';
import { EventCard } from '../../components/events/EventCard';
import { useFocusEffect } from '@react-navigation/native';
import { FriendsService } from '../../services/friends.service';
import { format } from 'date-fns';
import UserRating from '../../components/UserRating';

const { width } = Dimensions.get('window');
const GRID_SPACING = 2;
const NUM_COLUMNS = 3;
const GRID_GAP = 8;
const ITEM_WIDTH = (width - (NUM_COLUMNS - 1) * GRID_GAP - 32) / NUM_COLUMNS;

type ViewMode = 'grid' | 'list';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#5C6BC0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  profileSection: {
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 24,
  },
  statsContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    fontFamily: 'Roboto',
  },
  editButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  actionButtons: {
    marginTop: 8,
  },
  actionButton: {
    marginVertical: 8,
  },
  rowButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfButton: {
    flex: 0.48,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  messageButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  messagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  messagesText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#5C6BC0',
  },
  eventsContainer: {
    padding: 16,
  },
  emptyEventsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyEventsText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  emptyEventsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
    fontFamily: 'Roboto',
  },
  createEventButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createEventText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  eventItem: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 120,
  },
  eventImagePlaceholder: {
    width: '100%',
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '500',
    padding: 8,
    fontFamily: 'Roboto',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
    fontFamily: 'Roboto',
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 16,
  },
  toggleButton: {
    padding: 8,
    width: 36,
    alignItems: 'center',
  },
  gridContainer: {
    paddingHorizontal: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: GRID_SPACING,
  },
  gridItem: {
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: GRID_GAP,
  },
  gridItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridItemPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationsSection: {
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
  },
  invitationsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  invitationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  invitationsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  invitationsSlider: {
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 8,
  },
  invitationSliderCard: {
    width: 240,
    height: 225,
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  invitationContent: {
    width: '100%',
    height: '55%',
    position: 'relative',
  },
  invitationSliderImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  invitationSliderImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  invitationSliderInfo: {
    padding: 12,
    flex: 1,
  },
  invitationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  invitationDate: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  invitationActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  declineButton: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  joinButton: {
    padding: 8,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  joinButtonText: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  invitedTag: {
    padding: 6,
    borderRadius: 6,
  },
  invitedTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  ratingContainer: {
    marginBottom: 8,
  },
});

export default function ProfileScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams(); 
  
  const [displayName, setDisplayName] = useState<string>('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userBio, setUserBio] = useState<string>('');
  const [userEvents, setUserEvents] = useState<Event[]>([]);
  const [friendsCount, setFriendsCount] = useState<number>(0);
  const [attendingCount, setAttendingCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [invitedEvents, setInvitedEvents] = useState<Event[]>([]);
  const [isInvitationsExpanded, setIsInvitationsExpanded] = useState(false);
  
  // Determine if this is for the current user
  const currentUserId = auth.currentUser?.uid;
  const paramId = params.id as string | undefined;

  // If an ID is provided in the params and it's not the current user, redirect to the profile page
  useEffect(() => {
    if (paramId && paramId !== currentUserId) {
      router.replace(`/profile/${paramId}`);
    }
  }, [paramId, currentUserId]);

  // Function to fetch user profile data
  const fetchUserProfile = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      if (!currentUserId) {
        setError('User not logged in');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Get user data
      const userData = await UserService.getUser(currentUserId);
      if (userData) {
        setDisplayName(userData.displayName || 'User');
        setProfileImage(userData.photoURL || null);
        setUserBio(userData.bio || '');
      } else {
        setError('User not found');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Fetch user's events
      try {
        const eventsQuery = query(
          collection(db, 'events'),
          where('createdBy', '==', currentUserId)
        );
        const eventsSnapshot = await getDocs(eventsQuery);
        const eventsData = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Event));
        setUserEvents(eventsData);
      } catch (error) {
        console.error('Error fetching user events:', error);
      }
      
      // Fetch events user is invited to
      try {
        // First cleanup expired invitations
        await EventsService.cleanupExpiredInvitationsAndRequests();
        
        const invitedEventsData = await EventsService.getInvitedEvents(currentUserId);
        setInvitedEvents(invitedEventsData);
      } catch (error) {
        console.error('Error fetching invited events:', error);
      }
      
      // Fetch friends count
      try {
        const count = await FriendsService.getFriendsCount(currentUserId);
        setFriendsCount(count);
      } catch (error) {
        console.error('Error fetching friends count:', error);
      }
      
      // Fetch attended events count
      try {
        const count = await EventsService.getAttendingEventsCount(currentUserId);
        setAttendingCount(count);
      } catch (error) {
        console.error('Error fetching attending events count:', error);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setError('Error loading profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserProfile(false);
  }, [currentUserId]);

  // Fetch on mount only, not on focus
  useEffect(() => {
    fetchUserProfile();
  }, [currentUserId]);
  
  // Remove useFocusEffect - we don't want to fetch on every focus now
  
  const handleEditProfile = () => {
    router.push('/profile/edit');
  };

  const handleAcceptInvitation = async (eventId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      
      // Get the event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data() as Event;
      const participants = eventData.participants || [];
      
      // Find the user's participant entry and update its status
      const updatedParticipants = participants.map(p => {
        if (p.id === userId && p.status === AttendeeStatus.INVITED) {
          return {
            ...p,
            status: AttendeeStatus.ACCEPTED,
            // Update name and photo from current user if available
            name: auth.currentUser?.displayName || p.name,
            photoURL: auth.currentUser?.photoURL || p.photoURL
          };
        }
        return p;
      });
      
      // Update the event
      await updateDoc(doc(db, 'events', eventId), {
        participants: updatedParticipants
      });
      
      // Remove this invitation from the local state
      setInvitedEvents(invitedEvents.filter(event => event.id !== eventId));
      
      // Refresh the profile data to update attended events count
      fetchUserProfile();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (eventId: string) => {
    if (!auth.currentUser) return;
    
    try {
      const userId = auth.currentUser.uid;
      
      // Get the event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data() as Event;
      const participants = eventData.participants || [];
      
      // Remove the user from participants list or filter out the invited entry
      const updatedParticipants = participants.filter(
        p => !(p.id === userId && p.status === AttendeeStatus.INVITED)
      );
      
      // Update the event
      await updateDoc(doc(db, 'events', eventId), {
        participants: updatedParticipants
      });
      
      // Remove this invitation from the local state
      setInvitedEvents(invitedEvents.filter(event => event.id !== eventId));
      
    } catch (error) {
      console.error('Error declining invitation:', error);
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with profile title and settings button */}
      <View style={[styles.header, { 
        paddingTop: insets.top,
        backgroundColor: theme.background,
        borderBottomColor: theme.border,
        borderBottomWidth: 1
      }]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.username, { color: theme.text }]}>{auth.currentUser?.displayName}</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/settings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.text} />
        </TouchableOpacity>
        </View>
      </View>
      
      {viewMode === 'grid' ? (
        <FlatList
          key={`grid-${viewMode}`}
          data={[...userEvents].sort((a, b) => {
            const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Newest first
          })}
          renderItem={({ item, index }) => {
            // Calculate the column position
            const column = index % NUM_COLUMNS;
            return (
              <TouchableOpacity
                style={[
                  styles.gridItem, 
                  { 
                    width: ITEM_WIDTH,
                    marginLeft: column > 0 ? GRID_GAP : 0 
                  }
                ]}
                onPress={() => router.push(`/event/${item.id}`)}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.gridItemImage}
                  />
                ) : (
                  <View style={[styles.gridItemPlaceholder, { backgroundColor: theme.card }]}>
                    <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={() => (
            <>
              {/* Profile section */}
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <Image 
                    source={profileImage ? { uri: profileImage } : require('../../assets/default-avatar.png')} 
                    style={styles.profileImage}
                  />
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{friendsCount}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{attendingCount}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Attending</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[styles.displayName, { color: theme.text }]}>
                  {displayName}
                </Text>
                
                <View style={styles.ratingContainer}>
                  {currentUserId && <UserRating userId={currentUserId} />}
                </View>
                
                <Text style={[styles.bio, { color: theme.text }]}>
                  {userBio || 'No bio yet.'}
                </Text>
                
                <TouchableOpacity
                  style={[styles.editButton, { borderColor: theme.border }]}
                  onPress={handleEditProfile}
                >
                  <Text style={[styles.editButtonText, { color: theme.text }]}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
              
              {/* Invitations Section */}
              {invitedEvents.length > 0 && (
                <View style={[styles.invitationsSection, { backgroundColor: theme.card + '30' }]}>
                  <TouchableOpacity 
                    style={[
                      styles.invitationsSectionHeader,
                      { marginBottom: isInvitationsExpanded ? 12 : 0 }
                    ]}
                    onPress={() => setIsInvitationsExpanded(!isInvitationsExpanded)}
                  >
                    <Text style={[styles.invitationsSectionTitle, { color: theme.text }]}>
                      Event Invitations {invitedEvents.length > 0 && `(${invitedEvents.length})`}
                    </Text>
                    <View style={styles.invitationHeaderRight}>
                      {invitedEvents.length > 2 && (
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push('/settings/invitations');
                          }}
                          style={styles.viewAllButton}
                        >
                          <Text style={[styles.viewAllText, { color: theme.primary }]}>
                            View All
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Ionicons 
                        name={isInvitationsExpanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={theme.text} 
                        style={{marginLeft: 8}}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {isInvitationsExpanded && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.invitationsSlider}
                    >
                      {invitedEvents.map(event => (
                        <View key={event.id} style={[styles.invitationSliderCard, { backgroundColor: theme.card }]}>
                          <TouchableOpacity 
                            style={styles.invitationContent}
                            onPress={() => router.push(`/event/${event.id}`)}
                          >
                            {event.imageUrl ? (
                              <Image 
                                source={{ uri: event.imageUrl }} 
                                style={styles.invitationSliderImage} 
                              />
                            ) : (
                              <View style={[styles.invitationSliderImagePlaceholder, { backgroundColor: theme.primary + '20' }]}>
                                <Ionicons name="calendar-outline" size={28} color={theme.primary} />
                              </View>
                            )}
                            <View style={[styles.invitedTag, { backgroundColor: theme.primary + '15', position: 'absolute', top: 12, right: 12 }]}>
                              <Text style={[styles.invitedTagText, { color: theme.primary }]}>Invited</Text>
                            </View>
                          </TouchableOpacity>
                          
                          <View style={styles.invitationSliderInfo}>
                            <Text style={[styles.invitationTitle, { color: theme.text }]} numberOfLines={1}>
                              {event.title}
                            </Text>
                            <Text style={[styles.invitationDate, { color: theme.text + '80' }]}>
                              {format(event.date.toDate(), 'MMM d, yyyy • h:mm a')}
                            </Text>
                          </View>
                          
                          <View style={styles.invitationActionButtons}>
                            <TouchableOpacity 
                              style={[styles.declineButton, { borderColor: theme.error }]}
                              onPress={() => handleDeclineInvitation(event.id)}
                            >
                              <Text style={[styles.declineButtonText, { color: theme.error }]}>Decline</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                              style={[styles.joinButton, { backgroundColor: theme.primary }]}
                              onPress={() => handleAcceptInvitation(event.id)}
                            >
                              <Text style={[styles.joinButtonText, { color: 'white' }]}>Accept</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
              
              {/* Tabs for Events */}
              <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
                  <Ionicons name="calendar" size={24} color={theme.primary} />
                </TouchableOpacity>
                
                <View style={[styles.viewToggle, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode === ('grid' as ViewMode) && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons 
                      name="grid" 
                      size={18} 
                      color={viewMode === ('grid' as ViewMode) ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode === ('list' as ViewMode) && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons 
                      name="list" 
                      size={18} 
                      color={viewMode === ('list' as ViewMode) ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          ListEmptyComponent={
            <View style={styles.emptyEventsContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="calendar-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyEventsText, { color: theme.text }]}>No events yet</Text>
              <Text style={[styles.emptyEventsSubtext, { color: theme.text + '80' }]}>
                Create your first event by tapping the "+" button on the home tab
              </Text>
            </View>
          }
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16
          }}
        />
      ) : (
        <FlatList
          key={`list-${viewMode}`}
          data={[...userEvents].sort((a, b) => {
            const dateA = a.date.toDate ? a.date.toDate() : new Date(a.date);
            const dateB = b.date.toDate ? b.date.toDate() : new Date(b.date);
            return dateB.getTime() - dateA.getTime(); // Newest first
          })}
          renderItem={({ item }) => (
            <EventCard event={item} />
          )}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={() => (
            <>
              {/* Profile section */}
              <View style={styles.profileSection}>
                <View style={styles.profileHeader}>
                  <Image 
                    source={profileImage ? { uri: profileImage } : require('../../assets/default-avatar.png')} 
                    style={styles.profileImage}
                  />
                  
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{userEvents.length}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Events</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{friendsCount}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Friends</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: theme.text }]}>{attendingCount}</Text>
                      <Text style={[styles.statLabel, { color: theme.text + '80' }]}>Attending</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[styles.displayName, { color: theme.text }]}>
                  {displayName}
                </Text>
                
                <View style={styles.ratingContainer}>
                  {currentUserId && <UserRating userId={currentUserId} />}
                </View>
                
                <Text style={[styles.bio, { color: theme.text }]}>
                  {userBio || 'No bio yet.'}
                </Text>
                
                <TouchableOpacity
                  style={[styles.editButton, { borderColor: theme.border }]}
                  onPress={handleEditProfile}
                >
                  <Text style={[styles.editButtonText, { color: theme.text }]}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
              
              {/* Invitations Section */}
              {invitedEvents.length > 0 && (
                <View style={[styles.invitationsSection, { backgroundColor: theme.card + '30' }]}>
                  <TouchableOpacity 
                    style={[
                      styles.invitationsSectionHeader,
                      { marginBottom: isInvitationsExpanded ? 12 : 0 }
                    ]}
                    onPress={() => setIsInvitationsExpanded(!isInvitationsExpanded)}
                  >
                    <Text style={[styles.invitationsSectionTitle, { color: theme.text }]}>
                      Event Invitations {invitedEvents.length > 0 && `(${invitedEvents.length})`}
                    </Text>
                    <View style={styles.invitationHeaderRight}>
                      {invitedEvents.length > 2 && (
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            router.push('/settings/invitations');
                          }}
                          style={styles.viewAllButton}
                        >
                          <Text style={[styles.viewAllText, { color: theme.primary }]}>
                            View All
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Ionicons 
                        name={isInvitationsExpanded ? "chevron-up" : "chevron-down"} 
                        size={18} 
                        color={theme.text} 
                        style={{marginLeft: 8}}
                      />
                    </View>
                  </TouchableOpacity>
                  
                  {isInvitationsExpanded && (
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.invitationsSlider}
                    >
                      {invitedEvents.map(event => (
                        <View key={event.id} style={[styles.invitationSliderCard, { backgroundColor: theme.card }]}>
                          <TouchableOpacity 
                            style={styles.invitationContent}
                            onPress={() => router.push(`/event/${event.id}`)}
                          >
                            {event.imageUrl ? (
                              <Image 
                                source={{ uri: event.imageUrl }} 
                                style={styles.invitationSliderImage} 
                              />
                            ) : (
                              <View style={[styles.invitationSliderImagePlaceholder, { backgroundColor: theme.primary + '20' }]}>
                                <Ionicons name="calendar-outline" size={28} color={theme.primary} />
                              </View>
                            )}
                            <View style={[styles.invitedTag, { backgroundColor: theme.primary + '15', position: 'absolute', top: 12, right: 12 }]}>
                              <Text style={[styles.invitedTagText, { color: theme.primary }]}>Invited</Text>
                            </View>
                          </TouchableOpacity>
                          
                          <View style={styles.invitationSliderInfo}>
                            <Text style={[styles.invitationTitle, { color: theme.text }]} numberOfLines={1}>
                              {event.title}
                            </Text>
                            <Text style={[styles.invitationDate, { color: theme.text + '80' }]}>
                              {format(event.date.toDate(), 'MMM d, yyyy • h:mm a')}
                            </Text>
                          </View>
                          
                          <View style={styles.invitationActionButtons}>
                            <TouchableOpacity 
                              style={[styles.declineButton, { borderColor: theme.error }]}
                              onPress={() => handleDeclineInvitation(event.id)}
                            >
                              <Text style={[styles.declineButtonText, { color: theme.error }]}>Decline</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                              style={[styles.joinButton, { backgroundColor: theme.primary }]}
                              onPress={() => handleAcceptInvitation(event.id)}
                            >
                              <Text style={[styles.joinButtonText, { color: 'white' }]}>Accept</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  )}
                </View>
              )}
              
              {/* Tabs for Events */}
              <View style={[styles.tabsContainer, { borderBottomColor: theme.border }]}>
                <TouchableOpacity style={[styles.tabButton, styles.activeTab]}>
                  <Ionicons name="calendar" size={24} color={theme.primary} />
                </TouchableOpacity>
                
                <View style={[styles.viewToggle, { backgroundColor: theme.card }]}>
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode === ('grid' as ViewMode) && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setViewMode('grid')}
                  >
                    <Ionicons 
                      name="grid" 
                      size={18} 
                      color={viewMode === ('grid' as ViewMode) ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.toggleButton,
                      viewMode === ('list' as ViewMode) && { backgroundColor: theme.primary }
                    ]}
                    onPress={() => setViewMode('list')}
                  >
                    <Ionicons 
                      name="list" 
                      size={18} 
                      color={viewMode === ('list' as ViewMode) ? 'white' : theme.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
          ListEmptyComponent={
            <View style={styles.emptyEventsContainer}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="calendar-outline" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.emptyEventsText, { color: theme.text }]}>No events yet</Text>
              <Text style={[styles.emptyEventsSubtext, { color: theme.text + '80' }]}>
                Create your first event by tapping the "+" button on the home tab
              </Text>
            </View>
          }
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 16
          }}
        />
      )}
    </View>
  );
}