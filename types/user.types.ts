export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AuthError {
  code: string;
  message: string;
} 