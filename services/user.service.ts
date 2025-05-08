import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, onSnapshot, collection, query, where, Timestamp, getDocs, limit, orderBy, startAt, endAt } from 'firebase/firestore';
import { db } from '../config/firebase';
import { deleteField } from 'firebase/firestore';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  location?: {
    city?: string;
    province?: string;
  };
  interests?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeen?: Timestamp;
  isOnline?: boolean;
}

export class UserService {
  static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, collections.USERS, userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: userDoc.id,
          ...data,
        } as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  }

  static async updateUser(userId: string, data: Partial<User>): Promise<void> {
    try {
      await updateDoc(doc(db, collections.USERS, userId), {
        ...data,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  static async createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    try {
      const now = new Date();
      await setDoc(doc(db, collections.USERS, auth.currentUser.uid), {
        ...user,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async updateOnlineStatus(status: boolean): Promise<void> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('No authenticated user');

      const userRef = doc(db, collections.USERS, currentUser.uid);
      
      await updateDoc(userRef, {
        isOnline: status,
        lastSeen: status ? deleteField() : serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating online status:', error);
      throw error;
    }
  }

  static subscribeToUserPresence(userId: string, callback: (isOnline: boolean, lastSeen?: Date) => void): () => void {
    const userRef = doc(db, collections.USERS, userId);
    
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const userData = doc.data() as User;
        callback(
          userData.isOnline || false, 
          userData.lastSeen ? userData.lastSeen.toDate() : undefined
        );
      } else {
        callback(false);
      }
    });
  }

  static async searchUsers(searchTerm: string, maxResults: number = 20): Promise<User[]> {
    try {
      if (!searchTerm.trim()) {
        return [];
      }
      
      // Simplify the search approach - get all users and filter client-side
      // This is more efficient for small to medium-sized user databases
      const usersQuery = query(
        collection(db, collections.USERS),
        limit(100) // Reasonable limit to avoid loading too many users
      );
      
      const querySnapshot = await getDocs(usersQuery);
      
      if (querySnapshot.empty) {
        return [];
      }
      
      const searchTermLower = searchTerm.trim().toLowerCase();
      
      // Filter out the current user from results and filter by displayName
      const currentUserId = auth.currentUser?.uid;
      const users = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as User))
        .filter(user => 
          user.id !== currentUserId && 
          user.displayName?.toLowerCase().includes(searchTermLower)
        )
        .slice(0, maxResults);
      
      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }
} 