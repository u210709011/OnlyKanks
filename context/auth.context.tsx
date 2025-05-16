import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { User } from '../types/user.types';
import { useRouter, useSegments } from 'expo-router';
import { UserService } from '../services/user.service';
import { AppState, AppStateStatus, Alert } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { collections } from '../services/firebase.service';
import Constants from 'expo-constants';

// Get dev mode settings
const BYPASS_AUTH_IN_DEV = Constants.expoConfig?.extra?.bypassAuthInDev === true;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const rootSegment = segments && segments.length > 0 ? segments[0] : null;
  const router = useRouter();

  // Dev mode: bypass auth and create a dummy user
  useEffect(() => {
    if (BYPASS_AUTH_IN_DEV && isLoading) {
      setUser({
        id: 'dev-user-123',
        email: 'dev@example.com',
        displayName: 'Dev User',
      });
      setIsLoading(false);
    }
  }, [isLoading]);

  // Only run these effects if not in bypass mode
  if (!BYPASS_AUTH_IN_DEV) {
    // Handle app state changes for online presence
    useEffect(() => {
      const handleAppStateChange = async (nextAppState: AppStateStatus) => {
        if (!auth.currentUser) return;
        
        try {
          if (nextAppState === 'active') {
            await UserService.updateOnlineStatus(true);
          } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            await UserService.updateOnlineStatus(false);
          }
        } catch (error) {
          // Silently handle error
        }
      };

      try {
        const subscription = AppState.addEventListener('change', handleAppStateChange);

        // Set online when component mounts (app starts)
        if (auth.currentUser) {
          UserService.updateOnlineStatus(true).catch(() => {
            // Silently handle error
          });
        }

        return () => {
          subscription.remove();
          // Set offline when component unmounts (app closes)
          if (auth.currentUser) {
            UserService.updateOnlineStatus(false).catch(() => {
              // Silently handle error
            });
          }
        };
      } catch (error) {
        return () => {}; // Return empty cleanup function
      }
    }, []);

    useEffect(() => {
      let isMounted = true;
      
      try {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          try {
            if (!isMounted) return;
            
            if (firebaseUser) {
              // Check if the user document exists in Firestore
              const userDoc = await getDoc(doc(db, collections.USERS, firebaseUser.uid));
              
              if (!userDoc.exists()) {
                // User was deleted in Firebase console but still has a valid auth token
                await signOut(auth);
                if (isMounted) setUser(null);
              } else {
                // User exists, set online status with error handling
                try {
                  await UserService.updateOnlineStatus(true);
                } catch (onlineError) {
                  // Silently handle error
                }
                
                if (isMounted) {
                  setUser({
                    id: firebaseUser.uid,
                    email: firebaseUser.email!,
                    displayName: firebaseUser.displayName || undefined,
                    photoURL: firebaseUser.photoURL || undefined,
                  });
                }
              }
            } else {
              if (isMounted) setUser(null);
            }
          } catch (error) {
            // If there's an error, better to sign out and set user to null
            if (isMounted) setUser(null);
          } finally {
            if (isMounted) setIsLoading(false);
          }
        });

        return () => {
          isMounted = false;
          unsubscribe();
        };
      } catch (error) {
        setIsLoading(false);
        return () => {};
      }
    }, []);
  }

  useEffect(() => {
    if (!isLoading) {
      try {
        const isAuthGroup = rootSegment === '(auth)';
        
        if (!user && !isAuthGroup) {
          router.replace('/(auth)/sign-in');
        } else if (user && isAuthGroup) {
          router.replace('/(tabs)');
        }
      } catch (error) {
        // Silently handle error
      }
    }
  }, [user, isLoading, rootSegment, router]);

  return (
    <AuthContext.Provider value={{ user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext); 