import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';
import { collection, query, where, getDocs, GeoPoint, orderBy, Timestamp, serverTimestamp, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import uuid from 'react-native-uuid';
import { startOfDay, endOfDay, isAfter, isBefore, isEqual, addMinutes } from 'date-fns';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

export enum ParticipantType {
  USER = 'user',
  NON_USER = 'non-user'
}

export enum AttendeeStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  INVITED = 'invited'
}

export interface Participant {
  id: string;
  name: string;
  photoURL?: string | null;
  type: ParticipantType;
  status?: AttendeeStatus;
  requestId?: string; // ID of the join request document
}

export interface Event {
  id: string;
  title: string;
  description: string;
  date: any;
  location: {
    latitude: number;
    longitude: number;
    address: string;
    details?: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  categoryId?: string;
  subCategoryId?: string;
  imageUrl?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
  uploadDate?: any; // When the event was uploaded
  capacity?: number; // Maximum number of participants
  participants?: Participant[]; // List of participants (both users and non-users)
  duration?: number; // Duration in minutes
}

export interface EventFilterOptions {
  latitude?: number;
  longitude?: number;
  distance?: number;
  searchQuery?: string;
  categoryId?: string;
  subCategoryIds?: string[];
  dateRange?: {
    startDate: Date | null;
    endDate: Date | null;
  };
}

export interface EventInvitation {
  id?: string;
  eventId: string;
  eventTitle: string;
  eventImageUrl?: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: any;
}

export class EventsService {
  static async createEvent(eventData: Omit<Event, 'id' | 'createdBy' | 'createdAt' | 'updatedAt'>) {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const eventId = uuid.v4();
    await FirebaseService.setDocument(collections.EVENTS, eventId, {
      ...eventData,
      createdBy: auth.currentUser.uid,
    });

    return eventId;
  }

  static async getEventsNearby(latitude: number, longitude: number, radiusInKm: number = 10) {
    const center = new GeoPoint(latitude, longitude);
    const radiusInDeg = radiusInKm / 111.12;

    const eventsRef = collection(db, collections.EVENTS);
    const q = query(
      eventsRef,
      where('location.latitude', '>=', center.latitude - radiusInDeg),
      where('location.latitude', '<=', center.latitude + radiusInDeg)
    );

    const querySnapshot = await getDocs(q);
    const events: Event[] = [];

    const now = new Date();
    const todayStart = startOfDay(now);

    querySnapshot.forEach((doc) => {
      const event = doc.data() as Event;
      const eventDate = event.date.toDate();
      if (eventDate < todayStart) {
        return;
      }

      if (
        event.location.longitude >= center.longitude - radiusInDeg &&
        event.location.longitude <= center.longitude + radiusInDeg
      ) {
        events.push({ ...event, id: doc.id });
      }
    });

    return events;
  }

  static async getUserEvents(userId: string) {
    const eventsRef = collection(db, collections.EVENTS);
    const q = query(eventsRef, where('createdBy', '==', userId));
    const querySnapshot = await getDocs(q);
    const now = new Date();
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Event)
      .filter(event => {
        const eventDate = event.date.toDate();
        const endTime = event.duration ? addMinutes(eventDate, event.duration) : eventDate;
        
        // Only include events that haven't ended yet
        return now < endTime;
      });
  }

  static async getAllEvents() {
    const eventsRef = collection(db, collections.EVENTS);
    const q = query(eventsRef, orderBy('date', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Event)
      .filter(event => {
        const eventDate = event.date.toDate();
        const endTime = event.duration ? addMinutes(eventDate, event.duration) : eventDate;
        
        // Only include events that haven't ended yet
        return now < endTime;
      });
  }

  static async getFilteredEvents(filterOptions: EventFilterOptions = {}) {
    let events: Event[] = [];
    
    const allEvents = await this.getAllEvents();
    
    events = allEvents.filter(event => {
      // Search query filter
      if (filterOptions.searchQuery && filterOptions.searchQuery.trim() !== '') {
        const query = filterOptions.searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDescription = event.description.toLowerCase().includes(query);
        const matchesLocation = event.location.address.toLowerCase().includes(query);
        
        if (!(matchesTitle || matchesDescription || matchesLocation)) {
          return false;
        }
      }
      
      // Date range filter
      if (filterOptions.dateRange) {
        const eventDate = event.date.toDate();
        
        if (filterOptions.dateRange.startDate) {
          const startDate = startOfDay(filterOptions.dateRange.startDate);
          if (isBefore(eventDate, startDate)) {
            return false;
          }
        }
        
        if (filterOptions.dateRange.endDate) {
          const endDate = endOfDay(filterOptions.dateRange.endDate);
          if (isAfter(eventDate, endDate)) {
            return false;
          }
        }
      }
      
      // Distance filter
      if (
        filterOptions.latitude !== undefined && 
        filterOptions.longitude !== undefined &&
        filterOptions.distance !== undefined
      ) {
        const distance = this.calculateDistance(
          filterOptions.latitude,
          filterOptions.longitude,
          event.location.latitude,
          event.location.longitude
        );
        
        if (distance > filterOptions.distance) {
          return false;
        }
      }
      
      // Category filter
      if (filterOptions.categoryId && event.categoryId !== filterOptions.categoryId) {
        return false;
      }
      
      // Subcategory filter
      if (filterOptions.subCategoryIds && filterOptions.subCategoryIds.length > 0) {
        if (!event.subCategoryId || !filterOptions.subCategoryIds.includes(event.subCategoryId)) {
          return false;
        }
      }
      
      return true;
    });
    
    events.sort((a, b) => {
      return a.date.toDate().getTime() - b.date.toDate().getTime();
    });
    
    return events;
  }
  
  static groupEventsByDate(events: Event[]) {
    const groupedEvents: { [key: string]: Event[] } = {};
    
    events.forEach(event => {
      const eventDate = event.date.toDate();
      const dateKey = startOfDay(eventDate).getTime().toString();
      
      if (!groupedEvents[dateKey]) {
        groupedEvents[dateKey] = [];
      }
      
      groupedEvents[dateKey].push(event);
    });
    
    const result = Object.entries(groupedEvents).map(([dateKey, events]) => ({
      date: new Date(parseInt(dateKey)),
      events
    }));
    
    result.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return result;
  }
  
  static calculateDistance(
    lat1: number, 
    lon1: number, 
    lat2: number, 
    lon2: number
  ): number {
    const R = 6371;
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance;
  }
  
  private static deg2rad(deg: number): number {
    return deg * (Math.PI/180);
  }

  static async inviteUserToEvent(eventId: string, userId: string): Promise<string> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    try {
      // Get the event data
      const eventDoc = await getDoc(doc(db, collections.EVENTS, eventId));
      if (!eventDoc.exists()) {
        throw new Error('Event not found');
      }
      
      const eventData = eventDoc.data() as Event;
      
      // Check if the current user is the event creator
      if (eventData.createdBy !== auth.currentUser.uid) {
        throw new Error('Only the event creator can invite users');
      }
      
      // Check if user is already invited by checking participants list
      const participants = eventData.participants || [];
      if (participants.some(p => p.id === userId)) {
        throw new Error('User is already a participant');
      }
      
      // Create a pending participant instead of a separate invitation
      const newParticipant: Participant = {
        id: userId,
        name: 'Invited User', // This will be updated when they accept
        photoURL: null,
        type: ParticipantType.USER,
        status: AttendeeStatus.INVITED
      };
      
      // Try to get user data to update name and photo
      try {
        const userDoc = await getDoc(doc(db, collections.USERS, userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          newParticipant.name = userData.displayName || 'Invited User';
          newParticipant.photoURL = userData.photoURL || null;
        }
      } catch (e) {
        console.log('Error fetching invited user data:', e);
      }
      
      // Update the event with the new invited participant
      await updateDoc(doc(db, collections.EVENTS, eventId), {
        participants: [...participants, newParticipant]
      });
      
      // Send a notification to the invited user
      try {
        const currentUser = auth.currentUser;
        const userDoc = await getDoc(doc(db, collections.USERS, currentUser!.uid));
        const userName = userDoc.exists() ? userDoc.data().displayName || currentUser!.displayName : 'Someone';
        
        await NotificationService.sendEventInviteNotification(
          userId,
          userName,
          eventData.title,
          eventId
        );
      } catch (error) {
        console.error('Error sending invitation notification:', error);
        // Continue even if notification fails
      }
      
      return eventId; // Return the event ID instead of invitation ID
    } catch (error) {
      console.error('Error inviting user to event:', error);
      throw error;
    }
  }
  
  static async getUserInvitations(): Promise<EventInvitation[]> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    try {
      const invitationsQuery = query(
        collection(db, collections.INVITATIONS),
        where('recipientId', '==', auth.currentUser.uid),
        where('status', '==', 'pending')
      );
      
      const snapshot = await getDocs(invitationsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EventInvitation));
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      throw error;
    }
  }
  
  static async respondToInvitation(invitationId: string, accept: boolean): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    try {
      // Get the invitation
      const invitationDoc = await getDoc(doc(db, collections.INVITATIONS, invitationId));
      if (!invitationDoc.exists()) {
        throw new Error('Invitation not found');
      }
      
      const invitation = invitationDoc.data() as EventInvitation;
      
      // Update invitation status
      await updateDoc(doc(db, collections.INVITATIONS, invitationId), {
        status: accept ? 'accepted' : 'declined'
      });
      
      // If accepted, add user to event participants
      if (accept) {
        const eventDoc = await getDoc(doc(db, collections.EVENTS, invitation.eventId));
        if (!eventDoc.exists()) {
          throw new Error('Event not found');
        }
        
        const eventData = eventDoc.data() as Event;
        const participants = eventData.participants || [];
        
        // Get user profile info
        const userDoc = await getDoc(doc(db, collections.USERS, auth.currentUser.uid));
        const userData = userDoc.exists() ? userDoc.data() : null;
        
        // Only add if not already a participant
        if (!participants.some(p => p.id === auth.currentUser?.uid)) {
          const newParticipant: Participant = {
            id: auth.currentUser?.uid || '',
            name: userData?.displayName || auth.currentUser?.displayName || 'User',
            photoURL: userData?.photoURL || auth.currentUser?.photoURL || null,
            type: ParticipantType.USER,
            status: AttendeeStatus.ACCEPTED
          };
          
          await updateDoc(doc(db, collections.EVENTS, invitation.eventId), {
            participants: [...participants, newParticipant]
          });
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      throw error;
    }
  }

  // Get events created by the current user that have pending join requests
  static async getEventsWithPendingRequests(): Promise<Event[]> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Get all events created by the current user
    const events = await this.getUserEvents(auth.currentUser.uid);
    
    const now = new Date();
    
    // Filter to only include events with pending requests and that haven't ended
    return events.filter(event => {
      // Check if event has pending requests
      const hasPendingRequests = event.participants?.some(participant => 
        participant.status === AttendeeStatus.PENDING
      );
      
      if (!hasPendingRequests) return false;
      
      // Check if event has ended
      const eventDate = event.date.toDate();
      const endTime = event.duration ? addMinutes(eventDate, event.duration) : eventDate;
      
      // Only include events that haven't ended yet
      return now < endTime;
    });
  }

  // Count pending requests for a specific event
  static countPendingRequests(event: Event): number {
    return event.participants?.filter(
      participant => participant.status === AttendeeStatus.PENDING
    ).length || 0;
  }
  
  // Accept a user's request to join an event
  static async acceptEventRequest(eventId: string, participantId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    const eventRef = doc(db, collections.EVENTS, eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventDoc.data() as Event;
    
    // Verify that the current user is the event creator
    if (eventData.createdBy !== auth.currentUser.uid) {
      throw new Error('Only the event creator can accept join requests');
    }
    
    // Find the participant with pending status
    const participants = eventData.participants || [];
    const participantIndex = participants.findIndex(
      p => p.id === participantId && p.status === AttendeeStatus.PENDING
    );
    
    if (participantIndex === -1) {
      throw new Error('Pending request not found');
    }
    
    // Get the latest user data to ensure we have their current photo
    try {
      const userData = await UserService.getUser(participantId);
      if (userData && userData.photoURL) {
        // Update the participant's photo URL if available
        participants[participantIndex].photoURL = userData.photoURL;
      }
    } catch (error) {
      console.error("Error fetching user data for photo URL:", error);
      // Continue with the process even if we couldn't get the photo
    }
    
    // Update the participant status
    participants[participantIndex].status = AttendeeStatus.ACCEPTED;
    
    // Update the event document
    await updateDoc(eventRef, {
      participants: participants
    });
    
    // Send notification to the user
    try {
      // Get event and creator data for the notification
      const userData = await UserService.getUser(auth.currentUser.uid);
      const hostName = userData?.displayName || auth.currentUser.displayName || 'Event Host';
      
      await NotificationService.sendEventRequestAcceptedNotification(
        participantId,
        hostName,
        eventData.title,
        eventId
      );
    } catch (error) {
      console.error('Error sending request accepted notification:', error);
      // Continue even if notification fails
    }
  }
  
  // Reject a user's request to join an event
  static async rejectEventRequest(eventId: string, participantId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    const eventRef = doc(db, collections.EVENTS, eventId);
    const eventDoc = await getDoc(eventRef);
    
    if (!eventDoc.exists()) {
      throw new Error('Event not found');
    }
    
    const eventData = eventDoc.data() as Event;
    
    // Verify that the current user is the event creator
    if (eventData.createdBy !== auth.currentUser.uid) {
      throw new Error('Only the event creator can reject join requests');
    }
    
    // Find the participant with pending status
    const participants = eventData.participants || [];
    const participantIndex = participants.findIndex(
      p => p.id === participantId && p.status === AttendeeStatus.PENDING
    );
    
    if (participantIndex === -1) {
      throw new Error('Pending request not found');
    }
    
    // Remove the participant from the list
    participants.splice(participantIndex, 1);
    
    // Update the event document
    await updateDoc(eventRef, {
      participants: participants
    });
    
    // Send notification to the user
    try {
      // Get event and creator data for the notification
      const userData = await UserService.getUser(auth.currentUser.uid);
      const hostName = userData?.displayName || auth.currentUser.displayName || 'Event Host';
      
      await NotificationService.sendEventRequestDeclinedNotification(
        participantId,
        hostName,
        eventData.title
      );
    } catch (error) {
      console.error('Error sending request declined notification:', error);
      // Continue even if notification fails
    }
  }

  // Get events that a user is attending (but not created by them)
  static async getEventsAttending(userId: string): Promise<Event[]> {
    try {
      // Get all events
      const eventsRef = collection(db, collections.EVENTS);
      const querySnapshot = await getDocs(eventsRef);
      
      const now = new Date();
      
      // Filter for events where the user is a participant with ACCEPTED status
      // but not the creator of the event
      const attendingEvents = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Event)
        .filter(event => {
          // Skip events created by the user
          if (event.createdBy === userId) return false;
          
          // Check if user is a participant
          const isAttending = event.participants?.some(
            p => p.id === userId && 
            p.type === ParticipantType.USER && 
            (p.status === AttendeeStatus.ACCEPTED || p.status === undefined)
          );
          
          if (!isAttending) return false;
          
          // Check if event has ended (considering both date and duration)
          const eventDate = event.date.toDate();
          const endTime = event.duration ? addMinutes(eventDate, event.duration) : eventDate;
          
          // Only include events that haven't ended yet
          return now < endTime;
        });
      
      return attendingEvents;
    } catch (error) {
      console.error('Error fetching events attending:', error);
      return [];
    }
  }
  
  // Count events a user is attending
  static async getAttendingEventsCount(userId: string): Promise<number> {
    try {
      // First try with the optimized method
      try {
        const attendingEvents = await this.getEventsAttending(userId);
        return attendingEvents.length;
      } catch (error) {
        console.error('Optimized attending events query failed:', error);
        
        // Fallback approach: get all events and filter in memory
        const eventsRef = collection(db, collections.EVENTS);
        const allEventsSnapshot = await getDocs(eventsRef);
        
        const now = new Date();
        const todayStart = startOfDay(now);
        
        const attendingEvents = allEventsSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }) as Event)
          .filter(event => {
            // Skip past events
            const eventDate = event.date.toDate ? event.date.toDate() : new Date(event.date);
            if (eventDate < todayStart) return false;
            
            // Skip events created by the user
            if (event.createdBy === userId) return false;
            
            // Check if user is a participant
            return event.participants?.some(
              p => p.id === userId && 
              p.type === ParticipantType.USER && 
              (p.status === AttendeeStatus.ACCEPTED || p.status === undefined)
            );
          });
        
        return attendingEvents.length;
      }
    } catch (error) {
      console.error('Error counting attending events:', error);
      // Return 0 as a fallback to avoid breaking the UI
      return 0;
    }
  }

  // Get events that a user is invited to
  static async getInvitedEvents(userId: string): Promise<Event[]> {
    try {
      // Get all events
      const eventsRef = collection(db, collections.EVENTS);
      const querySnapshot = await getDocs(eventsRef);
      
      const now = new Date();
      
      // Filter for events where the user is a participant with INVITED status
      const invitedEvents = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Event)
        .filter(event => {
          // Check if user is invited
          const isInvited = event.participants?.some(
            p => p.id === userId && 
            p.type === ParticipantType.USER && 
            p.status === AttendeeStatus.INVITED
          );
          
          if (!isInvited) return false;
          
          // Check if event has ended (considering both date and duration)
          const eventDate = event.date.toDate();
          const endTime = event.duration ? addMinutes(eventDate, event.duration) : eventDate;
          
          // Only include events that haven't ended yet
          return now < endTime;
        });
      
      return invitedEvents;
    } catch (error) {
      console.error('Error fetching invited events:', error);
      return [];
    }
  }

  // Clean up expired invitations and requests from events
  static async cleanupExpiredInvitationsAndRequests(eventId?: string): Promise<void> {
    try {
      const now = new Date();
      let eventsToCheck: Event[] = [];
      
      // If eventId is provided, only check that specific event
      if (eventId) {
        const eventDoc = await getDoc(doc(db, collections.EVENTS, eventId));
        if (eventDoc.exists()) {
          eventsToCheck = [{
            id: eventDoc.id,
            ...eventDoc.data()
          } as Event];
        }
      } else {
        // Otherwise, get all events
        const eventsRef = collection(db, collections.EVENTS);
        const querySnapshot = await getDocs(eventsRef);
        eventsToCheck = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }) as Event);
      }
      
      // Process each event
      for (const event of eventsToCheck) {
        // Check if event has ended
        const eventDate = event.date.toDate();
        const endTime = event.duration ? addMinutes(eventDate, event.duration) : eventDate;
        
        if (now < endTime) continue; // Skip events that haven't ended yet
        
        // Get the participants array
        const participants = event.participants || [];
        
        // Filter out pending and invited participants
        const updatedParticipants = participants.filter(p => 
          p.status !== AttendeeStatus.PENDING && 
          p.status !== AttendeeStatus.INVITED
        );
        
        // Only update if there are changes
        if (updatedParticipants.length !== participants.length) {
          // Update the event document
          await updateDoc(doc(db, collections.EVENTS, event.id), {
            participants: updatedParticipants
          });
          console.log(`Cleaned up ${participants.length - updatedParticipants.length} expired invitations/requests for event ${event.id}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up expired invitations and requests:', error);
    }
  }
} 