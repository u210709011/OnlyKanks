import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';
import { collection, query, where, getDocs, GeoPoint, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import uuid from 'react-native-uuid';
import { startOfDay, endOfDay, isAfter, isBefore, isEqual } from 'date-fns';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: any;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  imageUrl?: string;
  createdBy: string;
  createdAt: any;
  updatedAt: any;
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
} 