import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface User {
  id: string;
  displayName: string;
  email: string;
  photoURL?: string;
  bio?: string;
  createdAt: any;
  updatedAt: any;
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
} 