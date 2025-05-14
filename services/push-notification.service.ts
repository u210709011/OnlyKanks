import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { collections } from './firebase.service';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export class PushNotificationService {
  static async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push Notifications are not available on emulator');
      return null;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }
      
      // Get the token for this device
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      
      // Save the token to the user's document in Firestore
      await this.savePushToken(token);
      
      // Configure foreground notification behavior on Android
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }
      
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }
  
  static async savePushToken(token: string) {
    if (!auth.currentUser) return;
    
    try {
      const userRef = doc(db, collections.USERS, auth.currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Update the user document with the push token
        await setDoc(userRef, { 
          pushToken: token,
          deviceType: Platform.OS
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error saving push token:', error);
    }
  }

  static async scheduleLocalNotification(
    title: string,
    body: string, 
    data: any = {}
  ) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Error scheduling local notification:', error);
    }
  }
} 