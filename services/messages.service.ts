import { FirebaseService, collections } from './firebase.service';
import { auth, db } from '../config/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, onSnapshot, doc, getDoc, writeBatch, increment } from 'firebase/firestore';
import { NotificationService } from './notification.service';
import { UserService } from './user.service';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: any;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  lastMessageDate?: any;
  lastMessageSenderId?: string;
  unreadCounts: { [userId: string]: number };
}

export class MessagesService {
  static async createOrGetChat(otherUserId: string): Promise<string> {
    if (!auth.currentUser) throw new Error('Not authenticated');
    
    const currentUserId = auth.currentUser.uid;
    
    // Check if chat already exists
    const chatsRef = collection(db, collections.CHATS);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId)
    );
    
    const querySnapshot = await getDocs(q);
    const existingChat = querySnapshot.docs.find(doc => {
      const chatData = doc.data();
      return chatData.participants.includes(otherUserId);
    });

    if (existingChat) {
      return existingChat.id;
    }

    // Create new chat if none exists with initialized unread counts for both users
    const unreadCounts: { [key: string]: number } = {};
    unreadCounts[currentUserId] = 0;
    unreadCounts[otherUserId] = 0;

    const newChat = {
      participants: [currentUserId, otherUserId],
      createdAt: new Date(),
      lastMessageDate: new Date(),
      lastMessage: '',
      unreadCounts,
    };

    const docRef = await addDoc(chatsRef, newChat);
    return docRef.id;
  }

  static async sendMessage(chatId: string, content: string): Promise<string> {
    if (!auth.currentUser) throw new Error('Not authenticated');

    let chatRef;
    if (chatId.startsWith('new/')) {
      const otherUserId = chatId.split('/')[1];
      chatId = await this.createOrGetChat(otherUserId);
      chatRef = doc(db, collections.CHATS, chatId);
    } else {
      chatRef = doc(db, collections.CHATS, chatId);
    }

    const chatDoc = await getDoc(chatRef);
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }

    const chatData = chatDoc.data() as Chat;
    const receiverId = chatData.participants.find(id => id !== auth.currentUser!.uid);

    if (!receiverId) {
      throw new Error('Receiver not found');
    }

    const message = {
      chatId,
      senderId: auth.currentUser.uid,
      receiverId,
      content,
      createdAt: new Date(),
      read: false,
    };

    const batch = writeBatch(db);
    const messageRef = doc(collection(db, collections.MESSAGES));
    batch.set(messageRef, message);

    // Get existing unread counts or initialize if missing
    const unreadCounts = chatData.unreadCounts || {};
    
    // Set up the update object
    const updateData: any = {
      lastMessage: content,
      lastMessageDate: new Date(),
      lastMessageSenderId: auth.currentUser.uid,
    };

    // Increment unread count only for the receiver, not the sender
    updateData[`unreadCounts.${receiverId}`] = (unreadCounts[receiverId] || 0) + 1;
    
    // Always ensure sender's unread count is zero
    updateData[`unreadCounts.${auth.currentUser.uid}`] = 0;

    // Apply the updates
    batch.update(chatRef, updateData);
    
    await batch.commit();

    try {
      // Create a notification for the message
      // Only if this is a new message, not a reply in an active chat
      const isNewMessage = unreadCounts[receiverId] === 0;
      
      // Get sender name
      const userDoc = await getDoc(doc(db, collections.USERS, auth.currentUser.uid));
      const senderName = userDoc.exists() ? userDoc.data().displayName : 'Someone';
      
      if (isNewMessage) {
        // Send notification for new message
        await NotificationService.sendMessageNotification(
          receiverId,
          senderName,
          content,
          chatId
        );
      }
    } catch (error) {
      console.error('Error creating message notification:', error);
      // Don't throw here, message was already sent successfully
    }
    
    return chatId;
  }

  static async getChats(): Promise<Chat[]> {
    if (!auth.currentUser) throw new Error('Not authenticated');

    const chatsRef = collection(db, collections.CHATS);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', auth.currentUser.uid),
      orderBy('lastMessageDate', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      // For backward compatibility
      let unreadCount = 0;
      
      // If we have the new unreadCounts map, use the current user's count
      if (data.unreadCounts && auth.currentUser && data.unreadCounts[auth.currentUser.uid] !== undefined) {
        unreadCount = data.unreadCounts[auth.currentUser.uid];
      } else if (data.unreadCount !== undefined) {
        // For backward compatibility with old data
        unreadCount = data.unreadCount;
      }
      
      // Include both properties to support transition
      return {
        id: doc.id,
        ...data,
        unreadCount, // For backward compatibility
        unreadCounts: data.unreadCounts || {} // Ensure unreadCounts exists
      } as unknown as Chat;
    });
  }

  static async subscribeToMessages(chatId: string, callback: (messages: Message[]) => void) {
    if (!auth.currentUser) throw new Error('Not authenticated');

    // First verify the user is a participant in the chat
    const chatRef = doc(db, collections.CHATS, chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      throw new Error('Chat not found');
    }

    const chatData = chatDoc.data() as Chat;
    if (!chatData.participants.includes(auth.currentUser.uid)) {
      throw new Error('Not a participant in this chat');
    }

    // Then subscribe to messages
    const messagesRef = collection(db, collections.MESSAGES);
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      callback(messages);
    });
  }

  static async markChatAsRead(chatId: string): Promise<void> {
    if (!auth.currentUser) throw new Error('Not authenticated');

    const chatRef = doc(db, collections.CHATS, chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) return;
    
    const chatData = chatDoc.data() as Chat;
    
    // Only mark as read if user is a participant
    if (!chatData.participants.includes(auth.currentUser.uid)) return;

    const batch = writeBatch(db);

    // Update only this user's unread count to zero
    batch.update(chatRef, {
      [`unreadCounts.${auth.currentUser.uid}`]: 0
    });

    // Mark all messages as read that were sent TO the current user
    const q = query(
      collection(db, collections.MESSAGES),
      where('chatId', '==', chatId),
      where('receiverId', '==', auth.currentUser.uid),
      where('read', '==', false)
    );

    const unreadMessages = await getDocs(q);
    unreadMessages.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
  }

  // Add a migration helper to upgrade old chat documents
  static async migrateChatsToNewFormat(): Promise<void> {
    if (!auth.currentUser) throw new Error('Not authenticated');

    const chatsRef = collection(db, collections.CHATS);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', auth.currentUser.uid)
    );

    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let batchCount = 0;
    const maxBatchSize = 500; // Firestore batch limit

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Check if this chat needs migration (has unreadCount but no unreadCounts)
      if (data.unreadCount !== undefined && !data.unreadCounts) {
        const unreadCounts: { [key: string]: number } = {};
        
        // Initialize unread counts for all participants
        for (const participantId of data.participants) {
          // If this is the current user, set to 0, otherwise preserve the original count
          unreadCounts[participantId] = participantId === auth.currentUser.uid ? 0 : data.unreadCount;
        }

        batch.update(doc.ref, {
          unreadCounts,
          // Don't delete unreadCount yet for backward compatibility
        });

        batchCount++;
        
        // If we've reached the batch limit, commit and start a new batch
        if (batchCount >= maxBatchSize) {
          await batch.commit();
          batchCount = 0;
        }
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
    }
  }

  static async findExistingChat(otherUserId: string): Promise<string | null> {
    if (!auth.currentUser) throw new Error('Not authenticated');
    
    const currentUserId = auth.currentUser.uid;
    
    // Check if chat already exists
    const chatsRef = collection(db, collections.CHATS);
    const q = query(
      chatsRef,
      where('participants', 'array-contains', currentUserId)
    );
    
    const querySnapshot = await getDocs(q);
    const existingChat = querySnapshot.docs.find(doc => {
      const chatData = doc.data();
      return chatData.participants.includes(otherUserId);
    });

    if (existingChat) {
      return existingChat.id;
    }

    return null;
  }

  static async createChat(otherUserId: string): Promise<string> {
    if (!auth.currentUser) throw new Error('Not authenticated');
    
    const currentUserId = auth.currentUser.uid;
    
    // Create new chat with initialized unread counts for both users
    const unreadCounts: { [key: string]: number } = {};
    unreadCounts[currentUserId] = 0;
    unreadCounts[otherUserId] = 0;

    const newChat = {
      participants: [currentUserId, otherUserId],
      createdAt: new Date(),
      lastMessageDate: new Date(),
      lastMessage: '',
      unreadCounts,
    };

    const chatsRef = collection(db, collections.CHATS);
    const docRef = await addDoc(chatsRef, newChat);
    return docRef.id;
  }
} 