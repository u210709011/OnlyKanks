import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where, writeBatch } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { collections } from './firebase.service';
import { PushNotificationService } from './push-notification.service';

export type NotificationType = 
  | 'event_invite' 
  | 'friend_request' 
  | 'comment' 
  | 'event_update' 
  | 'message'
  | 'event_request_accepted'
  | 'event_request_declined'
  | 'event_request';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  createdAt: any;
  read: boolean;
  title: string;
  body: string;
  data: any;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  static async createNotification(
    userId: string, 
    type: NotificationType, 
    title: string, 
    body: string, 
    data: any
  ): Promise<string> {
    try {
      const notificationRef = collection(db, collections.NOTIFICATIONS);
      
      const notificationData = {
        userId,
        type,
        title,
        body,
        data,
        createdAt: serverTimestamp(),
        read: false
      };
      
      const docRef = await addDoc(notificationRef, notificationData);
      
      // Also send a push notification if possible
      try {
        // Get the user's push token from Firestore
        const userDoc = await getDoc(doc(db, collections.USERS, userId));
        if (userDoc.exists() && userDoc.data().pushToken) {
          // Schedule a local notification
          await PushNotificationService.scheduleLocalNotification(
            title,
            body,
            { type, ...data }
          );
        }
      } catch (error) {
        console.error('Error sending push notification:', error);
        // Continue even if push notification fails
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }
  
  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      if (!auth.currentUser) throw new Error('User not authenticated');
      
      // First verify that the notification belongs to the current user
      const notificationRef = doc(db, collections.NOTIFICATIONS, notificationId);
      const notificationSnap = await getDoc(notificationRef);
      
      if (!notificationSnap.exists()) {
        throw new Error('Notification not found');
      }
      
      const notificationData = notificationSnap.data();
      
      // Check if notification belongs to current user
      if (notificationData.userId !== auth.currentUser.uid) {
        throw new Error('Not authorized to update this notification');
      }
      
      // Now update the notification
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Don't throw the error to prevent app crashes
    }
  }
  
  /**
   * Mark all notifications as read for current user
   */
  static async markAllAsRead(): Promise<void> {
    try {
      if (!auth.currentUser) throw new Error('User not authenticated');
      
      const notificationsRef = collection(db, collections.NOTIFICATIONS);
      const q = query(
        notificationsRef,
        where('userId', '==', auth.currentUser.uid),
        where('read', '==', false)
      );
      
      const snapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }
  
  /**
   * Send a message notification
   */
  static async sendMessageNotification(
    recipientId: string,
    senderName: string,
    messagePreview: string,
    chatId: string
  ): Promise<string> {
    try {
      // Check for recent message notifications from the same sender
      if (!auth.currentUser) throw new Error('User not authenticated');
      
      const notificationsRef = collection(db, collections.NOTIFICATIONS);
      const twoMinutesAgo = new Date();
      twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);
      
      const q = query(
        notificationsRef,
        where('userId', '==', recipientId),
        where('type', '==', 'message'),
        where('data.chatId', '==', chatId),
        where('createdAt', '>=', twoMinutesAgo)
      );
      
      const snapshot = await getDocs(q);
      
      // If recent notification exists, update it instead of creating a new one
      if (!snapshot.empty) {
        const recentNotification = snapshot.docs[0];
        const countUpdate = (recentNotification.data().data.messageCount || 1) + 1;
        
        await updateDoc(recentNotification.ref, {
          body: `You have ${countUpdate} new messages`,
          'data.messageCount': countUpdate,
          createdAt: serverTimestamp()
        });
        
        return recentNotification.id;
      }
    
      // Otherwise create a new notification
      const title = `New message from ${senderName}`;
      const body = messagePreview.length > 50 
        ? `${messagePreview.substring(0, 50)}...` 
        : messagePreview;
        
      return this.createNotification(
        recipientId,
        'message',
        title,
        body,
        { chatId, messageCount: 1 }
      );
    } catch (error) {
      console.error('Error sending message notification:', error);
      throw error;
    }
  }
  
  /**
   * Send an event invitation notification
   */
  static async sendEventInviteNotification(
    recipientId: string,
    senderName: string,
    eventName: string,
    eventId: string
  ): Promise<string> {
    const title = `Event Invitation from ${senderName}`;
    const body = `You've been invited to ${eventName}`;
    
    return this.createNotification(
      recipientId,
      'event_invite',
      title,
      body,
      { eventId }
    );
  }
  
  /**
   * Send a comment notification
   */
  static async sendCommentNotification(
    recipientId: string,
    commenterName: string,
    eventName: string,
    commentPreview: string,
    eventId: string
  ): Promise<string> {
    const title = `New comment from ${commenterName}`;
    const body = `On ${eventName}: ${commentPreview.length > 40 
      ? `${commentPreview.substring(0, 40)}...` 
      : commentPreview}`;
    
    return this.createNotification(
      recipientId,
      'comment',
      title,
      body,
      { eventId }
    );
  }
  
  /**
   * Send a friend request notification
   */
  static async sendFriendRequestNotification(
    recipientId: string,
    senderName: string,
    senderId: string
  ): Promise<string> {
    const title = `Friend Request`;
    const body = `${senderName} sent you a friend request`;
    
    return this.createNotification(
      recipientId,
      'friend_request',
      title,
      body,
      { userId: senderId }
    );
  }
  
  /**
   * Send an event request acceptance notification
   */
  static async sendEventRequestAcceptedNotification(
    recipientId: string,
    hostName: string,
    eventName: string,
    eventId: string
  ): Promise<string> {
    const title = `Event Request Accepted`;
    const body = `${hostName} accepted your request to join ${eventName}`;
    
    return this.createNotification(
      recipientId,
      'event_request_accepted',
      title,
      body,
      { eventId }
    );
  }
  
  /**
   * Send an event request declined notification
   */
  static async sendEventRequestDeclinedNotification(
    recipientId: string,
    hostName: string,
    eventName: string
  ): Promise<string> {
    const title = `Event Request Declined`;
    const body = `${hostName} declined your request to join ${eventName}`;
    
    return this.createNotification(
      recipientId,
      'event_request_declined',
      title,
      body,
      {}
    );
  }
  
  /**
   * Send an event update notification
   */
  static async sendEventUpdateNotification(
    recipientId: string,
    eventName: string,
    updateType: string,
    eventId: string
  ): Promise<string> {
    const title = `Event Update: ${eventName}`;
    const body = `The event details have been updated: ${updateType}`;
    
    return this.createNotification(
      recipientId,
      'event_update',
      title,
      body,
      { eventId }
    );
  }

  /**
   * Send an event join request notification
   */
  static async sendEventRequestNotification(
    recipientId: string,
    senderName: string,
    eventName: string,
    eventId: string
  ): Promise<string> {
    const title = `New Join Request`;
    const body = `${senderName} wants to join your event: ${eventName}`;
    
    return this.createNotification(
      recipientId,
      'event_request',
      title,
      body,
      { eventId, userId: auth.currentUser?.uid }
    );
  }
} 