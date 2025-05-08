import { collections } from './firebase.service';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc
} from 'firebase/firestore';

export interface EventComment {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  text: string;
  rating: number; // 1-5 star rating
  createdAt: Date;
}

export class CommentService {
  static async addComment(
    eventId: string, 
    text: string, 
    rating: number,
    userName: string,
    userPhotoURL?: string | null
  ): Promise<EventComment> {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      // Validate rating
      const validatedRating = Math.max(1, Math.min(5, Math.round(rating)));
      
      const commentData = {
        eventId,
        userId: auth.currentUser.uid,
        userName,
        userPhotoURL,
        text,
        rating: validatedRating,
        createdAt: serverTimestamp(),
      };

      const commentDoc = await addDoc(collection(db, collections.EVENT_COMMENTS), commentData);
      
      return {
        id: commentDoc.id,
        eventId,
        userId: auth.currentUser.uid,
        userName,
        userPhotoURL,
        text,
        rating: validatedRating,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Error adding comment:', error);
      throw error;
    }
  }

  static async getEventComments(eventId: string): Promise<EventComment[]> {
    try {
      const commentsQuery = query(
        collection(db, collections.EVENT_COMMENTS),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(commentsQuery);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          eventId: data.eventId,
          userId: data.userId,
          userName: data.userName,
          userPhotoURL: data.userPhotoURL,
          text: data.text,
          rating: data.rating,
          createdAt: (data.createdAt as Timestamp).toDate(),
        };
      });
    } catch (error) {
      console.error('Error fetching event comments:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<void> {
    if (!auth.currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      await deleteDoc(doc(db, collections.EVENT_COMMENTS, commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  static async getAverageRating(eventId: string): Promise<number | null> {
    try {
      const comments = await this.getEventComments(eventId);
      
      if (comments.length === 0) {
        return null;
      }
      
      const totalRating = comments.reduce((acc, comment) => acc + comment.rating, 0);
      return totalRating / comments.length;
    } catch (error) {
      console.error('Error calculating average rating:', error);
      throw error;
    }
  }
} 