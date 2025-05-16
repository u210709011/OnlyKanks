import { DeviceEventEmitter } from 'react-native';

/**
 * Global event emitter for app-wide event communication
 * Used for cleanup events, authentication state changes, etc.
 */
export const eventEmitter = DeviceEventEmitter; 