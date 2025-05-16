// This is a placeholder service since notifications don't work in Expo Go

export class NotificationTest {
  /**
   * This function just returns false since notifications are disabled
   */
  static async showLocalNotification() {
    console.log('Local notifications are disabled in Expo Go');
    return false;
  }
} 