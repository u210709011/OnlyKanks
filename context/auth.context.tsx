import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { User } from '../types/user.types';
import { useRouter, useSegments } from 'expo-router';
import { UserService } from '../services/user.service';
import { AppState, AppStateStatus } from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { collections } from '../services/firebase.service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, isLoading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const rootSegment = useSegments()[0];
  const router = useRouter();

  // Handle app state changes for online presence
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!auth.currentUser) return;
      
      if (nextAppState === 'active') {
        await UserService.updateOnlineStatus(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        await UserService.updateOnlineStatus(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Set online when component mounts (app starts)
    if (auth.currentUser) {
      UserService.updateOnlineStatus(true);
    }

    return () => {
      subscription.remove();
      // Set offline when component unmounts (app closes)
      if (auth.currentUser) {
        UserService.updateOnlineStatus(false);
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
      if (firebaseUser) {
          // Check if the user document exists in Firestore
          const userDoc = await getDoc(doc(db, collections.USERS, firebaseUser.uid));
          
          if (!userDoc.exists()) {
            // User was deleted in Firebase console but still has a valid auth token
            console.log('User document not found in Firestore, signing out');
            await signOut(auth);
            setUser(null);
          } else {
            // User exists, set online status
        await UserService.updateOnlineStatus(true);
        
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email!,
          displayName: firebaseUser.displayName || undefined,
          photoURL: firebaseUser.photoURL || undefined,
        });
          }
      } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        // If there's an error, better to sign out and set user to null
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const isAuthGroup = rootSegment === '(auth)';
      
      if (!user && !isAuthGroup) {
        router.replace('/(auth)/sign-in');
      } else if (user && isAuthGroup) {
        router.replace('/(tabs)');
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