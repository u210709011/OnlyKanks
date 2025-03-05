import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';
import { collection, query, where, getDocs, GeoPoint } from 'firebase/firestore';
import { db } from '../config/firebase';
import uuid from 'react-native-uuid';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: Date;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  imageUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
    const radiusInDeg = radiusInKm / 111.12; // rough conversion to degrees

    const eventsRef = collection(db, collections.EVENTS);
    const q = query(
      eventsRef,
      where('location.latitude', '>=', center.latitude - radiusInDeg),
      where('location.latitude', '<=', center.latitude + radiusInDeg)
    );

    const querySnapshot = await getDocs(q);
    const events: Event[] = [];

    querySnapshot.forEach((doc) => {
      const event = doc.data() as Event;
      // Further filter longitude (Firebase doesn't support multiple range queries)
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
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Event[];
  }
} 