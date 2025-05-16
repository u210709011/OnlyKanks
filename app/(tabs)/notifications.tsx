import { View, Text, StyleSheet, FlatList, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/theme.context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { auth, db } from '../../config/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp, getDocs } from 'firebase/firestore';
import { collections } from '../../services/firebase.service';
import { NotificationService } from '../../services/notification.service';
import { eventEmitter } from '../../utils/events';

interface Notification {
  id: string;
  type: 'event_invite' | 'friend_request' | 'comment' | 'event_update' | 'message' | 'event_request_accepted' | 'event_request_declined' | 'event_request';
  createdAt: Timestamp;
  read: boolean;
  title: string;
  body: string;
  data: any;
}

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    
    // Set up real-time listener for notifications
    const notificationsRef = collection(db, collections.NOTIFICATIONS);
    const q = query(
      notificationsRef,
      where('userId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      
      setNotifications(notificationsData);
      setLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error("Error in notifications listener:", error);
      setLoading(false);
      setRefreshing(false);
    });
    
    // Listen for logout events to clean up
    const handleCleanup = () => {
      console.log("Cleaning up notifications listener");
      unsubscribe();
    };
    
    eventEmitter.addListener('firebaseCleanup', handleCleanup);
    
    // Clean up listeners on unmount
    return () => {
      unsubscribe();
      eventEmitter.removeAllListeners('firebaseCleanup');
    };
  }, []);
  
  // Update refresh function to use setTimeout to avoid issues with pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Just wait a short time and the refreshing state will be reset by the listener
    setTimeout(() => {
      if (refreshing) {
        setRefreshing(false);
      }
    }, 1000);
  }, [refreshing]);

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read) {
      await NotificationService.markAsRead(notification.id);
      
      // Update local state to show the notification as read without refetching
      setNotifications(prevNotifications => 
        prevNotifications.map(item => 
          item.id === notification.id ? { ...item, read: true } : item
        )
      );
    }
    
    switch(notification.type) {
      case 'event_invite':
        router.push(`/event/${notification.data.eventId}`);
        break;
      case 'friend_request':
        router.push(`/profile/${notification.data.userId}`);
        break;
      case 'comment':
        router.push(`/event/${notification.data.eventId}`);
        break;
      case 'event_update':
        router.push(`/event/${notification.data.eventId}`);
        break;
      case 'message':
        router.push(`/chat/${notification.data.chatId}`);
        break;
      case 'event_request_accepted':
        router.push(`/event/${notification.data.eventId}`);
        break;
      case 'event_request':
        router.push('/settings/event-requests');
        break;
      default:
        break;
    }
  };

  const handleMarkAllAsRead = async () => {
    await NotificationService.markAllAsRead();
    
    // Update local state to show all notifications as read without refetching
    setNotifications(prevNotifications => 
      prevNotifications.map(item => ({ ...item, read: true }))
    );
  };

  const getNotificationIcon = (type: string) => {
    switch(type) {
      case 'event_invite': return 'calendar-outline';
      case 'friend_request': return 'person-add-outline';
      case 'comment': return 'chatbubble-outline';
      case 'event_update': return 'alert-circle-outline';
      case 'message': return 'mail-outline';
      case 'event_request_accepted': return 'checkmark-circle-outline';
      case 'event_request_declined': return 'close-circle-outline';
      case 'event_request': return 'enter-outline';
      default: return 'notifications-outline';
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => (
    <Pressable 
      style={[
        styles.notificationItem, 
        { 
          backgroundColor: item.read ? theme.background : theme.primary + '08',
          borderBottomColor: theme.border 
        }
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name={getNotificationIcon(item.type)} size={24} color={theme.primary} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.notificationBody, { color: theme.text + '80' }]}>{item.body}</Text>
        <Text style={[styles.notificationTime, { color: theme.text + '60' }]}>
          {item.createdAt && typeof item.createdAt.toDate === 'function' 
            ? format(item.createdAt.toDate(), 'MMM d, h:mm a')
            : 'Just now'}
        </Text>
      </View>
      {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />}
    </Pressable>
  );

  const hasUnreadNotifications = notifications.some(notification => !notification.read);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ height: insets.top, backgroundColor: theme.background }} />
      
      <View style={[styles.header, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
        
        <View style={{ flexDirection: 'row' }}>
          {hasUnreadNotifications && (
            <Pressable 
              onPress={handleMarkAllAsRead}
              style={({ pressed }) => [
                styles.markAllButton,
                pressed && { opacity: 0.7 }
              ]}
            >
              <Text style={[styles.markAllText, { color: theme.primary }]}>
                Mark all as read
              </Text>
            </Pressable>
          )}
        </View>
      </View>
      
      {notifications.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-outline" size={64} color={theme.text + '30'} style={{ marginBottom: 16 }} />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            No notifications yet
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.text + '80' }]}>
            You'll see notifications about events, friends, and messages here
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          contentContainerStyle={{ 
            paddingBottom: insets.bottom + 16,
            flexGrow: notifications.length === 0 ? 1 : undefined
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
  },
  markAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    fontFamily: 'Roboto',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  notificationBody: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'Roboto',
  },
  notificationTime: {
    fontSize: 12,
    fontFamily: 'Roboto',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
}); 