import { 
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  GeoPoint 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export const collections = {
  EVENTS: 'events',
  USERS: 'users',
  MESSAGES: 'messages',
  CHATS: 'chats',
  LOCATIONS: 'locations',
  FRIEND_REQUESTS: 'friendRequests',
  FRIENDS: 'friends',
} as const;

export class FirebaseService {
  static async getDocument(collectionName: string, docId: string) {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  }

  static async setDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static async updateDocument(collectionName: string, docId: string, data: any) {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
  }
} 