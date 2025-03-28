import { FirebaseService, collections } from './firebase.service';
import { auth, db } from '../config/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, onSnapshot, doc, getDoc, writeBatch, increment } from 'firebase/firestore';

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
  unreadCount: number;
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

    // Create new chat if none exists
    const newChat = {
      participants: [currentUserId, otherUserId],
      createdAt: new Date(),
      lastMessageDate: new Date(),
      lastMessage: '',
      unreadCount: 0,
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

    // Update the chat with the last sender information
    batch.update(chatRef, {
      lastMessage: content,
      lastMessageDate: new Date(),
      lastMessageSenderId: auth.currentUser.uid,
      // Only increment unread count for the receiver, not the sender
      unreadCount: increment(1)
    });

    await batch.commit();
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
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Chat[];
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

    // Only reset unread count if the last message wasn't sent by the current user
    if (chatData.lastMessageSenderId !== auth.currentUser.uid) {
      const batch = writeBatch(db);

      // Update chat unread count
      batch.update(chatRef, {
        unreadCount: 0
      });

      // Mark all messages as read
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
  }
} 