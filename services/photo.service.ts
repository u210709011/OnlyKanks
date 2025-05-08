import { collections } from './firebase.service';
import { db } from '../config/firebase';
import { collection, addDoc, deleteDoc, doc, getDocs, getDoc, query, where } from 'firebase/firestore';
import { CloudinaryService } from './cloudinary.service';

export interface EventPhoto {
  id: string;
  eventId: string;
  userId: string;
  photoURL: string;
  createdAt: Date;
  caption?: string;
}

export class PhotoService {
  static async uploadEventPhoto(
    eventId: string,
    userId: string,
    uri: string,
    caption?: string
  ): Promise<EventPhoto> {
    try {
      // Upload to Cloudinary
      const photoURL = await CloudinaryService.uploadImage(uri);

      // Create document data, only include caption if it has content
      const photoData: any = {
        eventId,
        userId,
        photoURL,
        createdAt: new Date(),
      };
      
      // Only add caption field if it exists and has content
      if (caption && caption.trim().length > 0) {
        photoData.caption = caption;
      }

      // Create photo document in Firestore
      const photoDoc = await addDoc(collection(db, collections.EVENT_PHOTOS), photoData);

      return {
        id: photoDoc.id,
        eventId,
        userId,
        photoURL,
        caption: caption && caption.trim().length > 0 ? caption : undefined,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error uploading photo:', error);
      throw error;
    }
  }

  static async getEventPhotos(eventId: string): Promise<EventPhoto[]> {
    try {
      const photosQuery = query(
        collection(db, collections.EVENT_PHOTOS),
        where('eventId', '==', eventId)
      );

      const querySnapshot = await getDocs(photosQuery);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      })) as EventPhoto[];
    } catch (error) {
      console.error('Error fetching event photos:', error);
      throw error;
    }
  }

  static async deleteEventPhoto(photoId: string): Promise<void> {
    try {
      const photoDoc = await getDoc(doc(db, collections.EVENT_PHOTOS, photoId));
      if (!photoDoc.exists()) {
        throw new Error('Photo not found');
      }
      
      // Delete from Firestore only
      // Note: We can't delete from Cloudinary without API keys
      await deleteDoc(doc(db, collections.EVENT_PHOTOS, photoId));
    } catch (error) {
      console.error('Error deleting photo:', error);
      throw error;
    }
  }
} 