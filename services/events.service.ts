import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';
import { collection, query, where, getDocs, GeoPoint, orderBy, Timestamp, serverTimestamp, addDoc, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import uuid from 'react-native-uuid';
import { startOfDay, endOfDay, isAfter, isBefore, isEqual } from 'date-fns';

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
    const todayStart = startOfDay(now);
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Event)
      .filter(event => {
        const eventDate = event.date.toDate();
        return eventDate >= todayStart;
      });
  }

  static async getAllEvents() {
    const eventsRef = collection(db, collections.EVENTS);
    const q = query(eventsRef, orderBy('date', 'asc'));
    const querySnapshot = await getDocs(q);
    
    const now = new Date();
    const todayStart = startOfDay(now);
    
    return querySnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }) as Event)
      .filter(event => {
        const eventDate = event.date.toDate();
        return eventDate >= todayStart;
      });
  }

  static async getFilteredEvents(filterOptions: EventFilterOptions = {}) {
    let events: Event[] = [];
    
    const allEvents = await this.getAllEvents();
    
    events = allEvents.filter(event => {
      if (filterOptions.searchQuery && filterOptions.searchQuery.trim() !== '') {
        const query = filterOptions.searchQuery.toLowerCase();
        const matchesTitle = event.title.toLowerCase().includes(query);
        const matchesDescription = event.description.toLowerCase().includes(query);
        const matchesLocation = event.location.address.toLowerCase().includes(query);
        
        if (!(matchesTitle || matchesDescription || matchesLocation)) {
          return false;
        }
      }
      
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
      
      // Update the event with the new invited participant
      await updateDoc(doc(db, collections.EVENTS, eventId), {
        participants: [...participants, newParticipant]
      });
      
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
} 