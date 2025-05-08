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
  doc,
  setDoc,
  getDoc,
  onSnapshot
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
      
      // Check if user has already commented on this event
      const existingComment = await this.getUserCommentForEvent(eventId, auth.currentUser.uid);
      if (existingComment) {
        throw new Error('You have already commented on this event');
      }
      
      // Create a consistent document ID
      const commentId = `${eventId}_${auth.currentUser.uid}`;
      
      const commentData = {
        eventId,
        userId: auth.currentUser.uid,
        userName,
        userPhotoURL,
        text,
        rating: validatedRating,
        createdAt: serverTimestamp(),
      };

      // Use setDoc with the specific document ID instead of addDoc
      await setDoc(doc(db, collections.EVENT_COMMENTS, commentId), commentData);
      
      return {
        id: commentId,
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

  static async getUserCommentForEvent(eventId: string, userId: string): Promise<EventComment | null> {
    try {
      // Try to get the comment directly using the consistent ID format
      const commentId = `${eventId}_${userId}`;
      const commentDocRef = doc(db, collections.EVENT_COMMENTS, commentId);
      const commentSnap = await getDoc(commentDocRef);
      
      if (commentSnap.exists()) {
        const data = commentSnap.data();
        return {
          id: commentSnap.id,
          eventId: data.eventId,
          userId: data.userId,
          userName: data.userName,
          userPhotoURL: data.userPhotoURL,
          text: data.text,
          rating: data.rating,
          createdAt: (data.createdAt as Timestamp).toDate(),
        };
      }
      
      // As a fallback, query by eventId and userId
      const commentsQuery = query(
        collection(db, collections.EVENT_COMMENTS),
        where('eventId', '==', eventId),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(commentsQuery);
      if (querySnapshot.empty) {
        return null;
      }
      
      const docSnapshot = querySnapshot.docs[0];
      const data = docSnapshot.data();
      
      return {
        id: docSnapshot.id,
        eventId: data.eventId,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        text: data.text,
        rating: data.rating,
        createdAt: (data.createdAt as Timestamp).toDate(),
      };
    } catch (error) {
      console.error('Error checking for existing comment:', error);
      return null;
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
      return querySnapshot.docs.map(docSnapshot => {
        const data = docSnapshot.data();
        return {
          id: docSnapshot.id,
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

  static subscribeToEventComments(
    eventId: string, 
    callback: (comments: EventComment[]) => void
  ): () => void {
    try {
      const commentsQuery = query(
        collection(db, collections.EVENT_COMMENTS),
        where('eventId', '==', eventId),
        orderBy('createdAt', 'desc')
      );
      
      const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
        const commentsData: EventComment[] = [];
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          commentsData.push({
            id: docSnapshot.id,
            eventId: data.eventId,
            userId: data.userId,
            userName: data.userName,
            userPhotoURL: data.userPhotoURL,
            text: data.text,
            rating: data.rating,
            createdAt: (data.createdAt as Timestamp)?.toDate() || new Date(),
          });
        });
        callback(commentsData);
      }, (error) => {
        console.error("Error getting comments: ", error);
      });
      
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up comments subscription:', error);
      // Return a no-op function as fallback
      return () => {};
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
      return parseFloat((totalRating / comments.length).toFixed(1));
    } catch (error) {
      console.error('Error calculating average rating:', error);
      throw error;
    }
  }
  
  static async getUserRating(userId: string): Promise<number | null> {
    try {
      // Get all events created by this user
      const eventsQuery = query(
        collection(db, collections.EVENTS),
        where('createdBy', '==', userId)
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      const eventIds = eventsSnapshot.docs.map(docSnapshot => docSnapshot.id);
      
      if (eventIds.length === 0) {
        return null;
      }
      
      // Get all comments for these events
      let totalRating = 0;
      let totalComments = 0;
      
      // Process each event individually to avoid large IN queries
      for (const eventId of eventIds) {
        const comments = await this.getEventComments(eventId);
        totalComments += comments.length;
        totalRating += comments.reduce((acc, comment) => acc + comment.rating, 0);
      }
      
      if (totalComments === 0) {
        return null;
      }
      
      return parseFloat((totalRating / totalComments).toFixed(1));
    } catch (error) {
      console.error('Error calculating user rating:', error);
      throw error;
    }
  }
} 