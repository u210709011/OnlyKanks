import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { LocationService } from './location.service';
import { collections } from './firebase.service';

export const signUp = async (email: string, password: string, displayName: string) => {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName });
    
    // Get user's location
    const location = await LocationService.getCurrentLocation();
    
    // Create user document in Firestore
    await setDoc(doc(db, collections.USERS, user.uid), {
      email,
      displayName,
      location,
      isOnline: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return user;
  } catch (error) {
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    
    // Check if user document exists in Firestore
    const userRef = doc(db, collections.USERS, user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // User exists in authentication but not in Firestore
      // This can happen if the user was created directly in Authentication
      // or if the Firestore document was deleted
      console.log('Creating missing user document in Firestore');
      
      // Get user's location
      const location = await LocationService.getCurrentLocation();
      
      // Create a new user document
      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || email.split('@')[0],
        location,
        isOnline: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // User exists, just update online status
      await setDoc(userRef, {
        isOnline: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    
    return user;
  } catch (error) {
    throw error;
  }
};

export const signOut = async () => {
  try {
    // Set user as offline before signing out
    if (auth.currentUser) {
      const userRef = doc(db, collections.USERS, auth.currentUser.uid);
      await setDoc(userRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    
    return firebaseSignOut(auth);
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
}; 