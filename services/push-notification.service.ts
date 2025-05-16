// This is a placeholder service that does nothing but log messages
// All functionality has been disabled because push notifications don't work in Expo Go

export class PushNotificationService {
  static async registerForPushNotifications() {
    console.log('[PushNotificationService] Push notifications disabled in Expo Go');
    return null;
  }
  
  static async savePushToken(token: string) {
    console.log('[PushNotificationService] Push notifications disabled in Expo Go');
    return;
  }

  static getChannelForNotificationType(type: string): string {
    console.log('[PushNotificationService] Push notifications disabled in Expo Go');
    return 'default';
  }

  static async scheduleLocalNotification(
    title: string,
    body: string, 
    data: any = {}
  ) {
    console.log('[PushNotificationService] Push notifications disabled in Expo Go');
    return;
  }
  
  static async getUserPushToken(userId: string): Promise<string | null> {
    console.log('[PushNotificationService] Push notifications disabled in Expo Go');
    return null;
  }
} 