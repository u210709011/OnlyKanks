import { FirebaseService, collections } from './firebase.service';
import { auth, db } from '../config/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { UserService } from './user.service';
import { NotificationService } from './notification.service';

export enum FriendRequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected'
}

export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: any;
  updatedAt: any;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  createdAt: any;
}

export class FriendsService {
  // Send a friend request
  static async sendFriendRequest(receiverId: string): Promise<string> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    if (auth.currentUser.uid === receiverId) throw new Error('Cannot send friend request to yourself');

    // Check if request already exists
    const existingRequest = await this.checkExistingRequest(auth.currentUser.uid, receiverId);
    if (existingRequest) {
      if (existingRequest.status === FriendRequestStatus.PENDING) {
        throw new Error('Friend request already sent');
      } else if (existingRequest.status === FriendRequestStatus.ACCEPTED) {
        throw new Error('Already friends');
      }
    }

    // Check if reverse request exists (receiver already sent you a request)
    const reverseRequest = await this.checkExistingRequest(receiverId, auth.currentUser.uid);
    if (reverseRequest && reverseRequest.status === FriendRequestStatus.PENDING) {
      // Auto-accept the reverse request instead of creating a new one
      await this.respondToFriendRequest(reverseRequest.id, FriendRequestStatus.ACCEPTED);
      return reverseRequest.id;
    }

    // Create new request
    const requestData = {
      senderId: auth.currentUser.uid,
      receiverId,
      status: FriendRequestStatus.PENDING,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, collections.FRIEND_REQUESTS), requestData);
    
    // Send notification to the receiver
    try {
      const currentUser = auth.currentUser;
      const userDoc = await UserService.getUser(currentUser.uid);
      const senderName = userDoc?.displayName || currentUser.displayName || 'Someone';
      
      await NotificationService.sendFriendRequestNotification(
        receiverId,
        senderName,
        currentUser.uid
      );
    } catch (error) {
      console.error('Error sending friend request notification:', error);
      // Continue even if notification fails
    }
    
    return docRef.id;
  }

  // Respond to a friend request (accept or reject)
  static async respondToFriendRequest(requestId: string, status: FriendRequestStatus.ACCEPTED | FriendRequestStatus.REJECTED): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const requestRef = doc(db, collections.FRIEND_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }

    const request = { id: requestSnap.id, ...requestSnap.data() } as FriendRequest;
    
    // Verify the current user is the receiver
    if (request.receiverId !== auth.currentUser.uid) {
      throw new Error('Not authorized to respond to this request');
    }

    // Update request status
    await updateDoc(requestRef, {
      status,
      updatedAt: Timestamp.now()
    });

    // Get current user info for notification
    const currentUser = auth.currentUser;
    const userDoc = await UserService.getUser(currentUser.uid);
    const responderName = userDoc?.displayName || currentUser.displayName || 'Someone';

    // If accepted, create friends relationship and send acceptance notification
    if (status === FriendRequestStatus.ACCEPTED) {
      // Create friend record for both users
      await addDoc(collection(db, collections.FRIENDS), {
        userId: request.senderId,
        friendId: request.receiverId,
        createdAt: Timestamp.now()
      });

      await addDoc(collection(db, collections.FRIENDS), {
        userId: request.receiverId,
        friendId: request.senderId,
        createdAt: Timestamp.now()
      });
      
      // Send notification to the sender about acceptance
      try {
        await NotificationService.sendFriendRequestAcceptedNotification(
          request.senderId,
          responderName,
          currentUser.uid
        );
      } catch (error) {
        console.error('Error sending friend request accepted notification:', error);
        // Continue even if notification fails
      }
    } else if (status === FriendRequestStatus.REJECTED) {
      // Send notification about rejection (using more neutral wording)
      try {
        await NotificationService.sendFriendRequestDeclinedNotification(
          request.senderId,
          responderName
        );
      } catch (error) {
        console.error('Error sending friend request declined notification:', error);
        // Continue even if notification fails
      }
    }
  }

  // Get all friend requests for current user
  static async getIncomingFriendRequests(): Promise<FriendRequest[]> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const requestsRef = collection(db, collections.FRIEND_REQUESTS);
    const q = query(
      requestsRef,
      where('receiverId', '==', auth.currentUser.uid),
      where('status', '==', FriendRequestStatus.PENDING),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FriendRequest[];
  }

  // Get all sent friend requests
  static async getOutgoingFriendRequests(): Promise<FriendRequest[]> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const requestsRef = collection(db, collections.FRIEND_REQUESTS);
    const q = query(
      requestsRef,
      where('senderId', '==', auth.currentUser.uid),
      where('status', '==', FriendRequestStatus.PENDING),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FriendRequest[];
  }

  // Get all friends
  static async getFriends(): Promise<Friend[]> {
    if (!auth.currentUser) throw new Error('User not authenticated');

    const friendsRef = collection(db, collections.FRIENDS);
    const q = query(
      friendsRef,
      where('userId', '==', auth.currentUser.uid)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Friend[];
  }

  // Check if users are friends
  static async areFriends(userId: string, otherUserId: string): Promise<boolean> {
    const friendsRef = collection(db, collections.FRIENDS);
    const q = query(
      friendsRef,
      where('userId', '==', userId),
      where('friendId', '==', otherUserId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  }

  // Check if a friend request exists between users
  static async checkExistingRequest(senderId: string, receiverId: string): Promise<FriendRequest | null> {
    const requestsRef = collection(db, collections.FRIEND_REQUESTS);
    const q = query(
      requestsRef,
      where('senderId', '==', senderId),
      where('receiverId', '==', receiverId)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as FriendRequest;
  }

  // Get friend request status between current user and another user
  static async getFriendRequestStatus(otherUserId: string): Promise<{
    status: 'none' | 'sent' | 'received' | 'friends';
    requestId?: string;
  }> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Check if already friends
    const areFriends = await this.areFriends(auth.currentUser.uid, otherUserId);
    if (areFriends) return { status: 'friends' };
    
    // Check outgoing request
    const outgoingRequest = await this.checkExistingRequest(auth.currentUser.uid, otherUserId);
    if (outgoingRequest && outgoingRequest.status === FriendRequestStatus.PENDING) {
      return { status: 'sent', requestId: outgoingRequest.id };
    }
    
    // Check incoming request
    const incomingRequest = await this.checkExistingRequest(otherUserId, auth.currentUser.uid);
    if (incomingRequest && incomingRequest.status === FriendRequestStatus.PENDING) {
      return { status: 'received', requestId: incomingRequest.id };
    }
    
    return { status: 'none' };
  }
  
  // Remove a friend
  static async removeFriend(friendId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    // Find and delete both friend records
    const friendsRef = collection(db, collections.FRIENDS);
    
    // Delete current user -> friend relationship
    const q1 = query(
      friendsRef,
      where('userId', '==', auth.currentUser.uid),
      where('friendId', '==', friendId)
    );
    
    const snapshot1 = await getDocs(q1);
    snapshot1.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
    
    // Delete friend -> current user relationship
    const q2 = query(
      friendsRef,
      where('userId', '==', friendId),
      where('friendId', '==', auth.currentUser.uid)
    );
    
    const snapshot2 = await getDocs(q2);
    snapshot2.forEach(async (doc) => {
      await deleteDoc(doc.ref);
    });
  }
  
  // Cancel a friend request
  static async cancelFriendRequest(requestId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('User not authenticated');
    
    const requestRef = doc(db, collections.FRIEND_REQUESTS, requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }
    
    const request = requestSnap.data() as FriendRequest;
    
    // Verify the current user is the sender
    if (request.senderId !== auth.currentUser.uid) {
      throw new Error('Not authorized to cancel this request');
    }
    
    // Delete the request
    await deleteDoc(requestRef);
  }

  // Get friends count for a specific user
  static async getFriendsCount(userId: string): Promise<number> {
    try {
      // First try with a direct query
      const friendsRef = collection(db, collections.FRIENDS);
      const q = query(
        friendsRef,
        where('userId', '==', userId)
      );

      try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.size;
      } catch (error) {
        // If direct query fails, try a different approach
        console.error('Direct friend count query failed:', error);
        
        // Get all friends (this might be allowed by rules)
        const allFriendsQuery = query(friendsRef);
        const allFriendsSnapshot = await getDocs(allFriendsQuery);
        
        // Filter in memory
        const userFriends = allFriendsSnapshot.docs.filter(
          doc => doc.data().userId === userId
        );
        
        return userFriends.length;
      }
    } catch (error) {
      console.error('Error counting friends:', error);
      // Return 0 as a fallback to avoid breaking the UI
      return 0;
    }
  }
} 