import * as ExpoLocation from 'expo-location';
import { FirebaseService, collections } from './firebase.service';
import { auth } from '../config/firebase';

export interface UserLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export class LocationService {
  static async getCurrentLocation(): Promise<UserLocation> {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Permission to access location was denied');
    }

    const location = await ExpoLocation.getCurrentPositionAsync({});
    const address = await this.getAddressFromCoords(
      location.coords.latitude,
      location.coords.longitude
    );

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      address,
    };
  }

  static async getAddressFromCoords(latitude: number, longitude: number): Promise<string> {
    try {
      const [address] = await ExpoLocation.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      
      return address 
        ? `${address.street || ''} ${address.city || ''} ${address.region || ''}`
        : '';
    } catch (error) {
      console.error('Error getting address:', error);
      return '';
    }
  }

  static async updateUserLocation(location: UserLocation) {
    if (!auth.currentUser) throw new Error('User not authenticated');

    await FirebaseService.updateDocument(collections.USERS, auth.currentUser.uid, {
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
      },
    });
  }
} 