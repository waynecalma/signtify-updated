import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { initializeUserProfile } from './firestoreUtils';
import { checkIsAdmin } from './adminUtils';

const AuthContext = createContext({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Development admin bypass credentials
  const DEV_ADMIN_EMAIL = 'signtifydev@dev.com';
  const DEV_ADMIN_PASSWORD = 'signtifydev';
  const DEV_SESSION_KEY = 'signtify_dev_admin_session';

  const getDevSessionUser = () => {
    const stored = localStorage.getItem(DEV_SESSION_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  };

  const startDevSession = (email) => {
    const mockUser = {
      uid: 'dev-admin-uid',
      email,
      displayName: 'Signtify Dev Admin',
      providerId: 'dev-bypass',
    };
    localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(mockUser));
    setCurrentUser(mockUser);
    setIsAdmin(true);
  };

  // Register new user
  const signup = async (email, password, displayName) => {
    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update display name in Firebase Auth
      if (displayName) {
        await updateProfile(user, {
          displayName: displayName
        });
      }
      
      // Initialize comprehensive user profile in Firestore
      await initializeUserProfile(user.uid, email, displayName);
      
      return userCredential;
    } catch (error) {
      console.error('Error during signup:', error);
      throw error;
    }
  };

  // Login user
  const login = async (email, password) => {
    try {
      // Development bypass: hardcoded credentials
      if (email === DEV_ADMIN_EMAIL && password === DEV_ADMIN_PASSWORD) {
        startDevSession(email);
        return { user: getDevSessionUser() };
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update last login timestamp in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      } else {
        // If user document doesn't exist (legacy users), initialize full profile
        await initializeUserProfile(user.uid, user.email, user.displayName || '');
      }
      
      return userCredential;
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // Google Sign-In
  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Add custom parameters for better compatibility
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      // Check if user profile exists, if not initialize it
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        await initializeUserProfile(user.uid, user.email, user.displayName || '');
      } else {
        // Update last login
        await setDoc(userRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }
      
      return userCredential;
    } catch (error) {
      console.error('Error during Google sign-in:', error);
      // Re-throw with more context
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Sign in cancelled');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Pop-up blocked. Please enable pop-ups for this site');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Network error. Please check your connection');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        throw new Error('An account already exists with this email. Please use email/password login.');
      }
      throw error;
    }
  };

  // Reset Password
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  };

  // Logout user
  const logout = () => {
    // Clear dev session if present
    localStorage.removeItem(DEV_SESSION_KEY);
    setIsAdmin(false);
    setCurrentUser(null);
    return signOut(auth).catch(() => Promise.resolve());
  };

  useEffect(() => {
    // If dev session exists, prefer it and skip Firebase listener
    const devUser = getDevSessionUser();
    if (devUser) {
      setCurrentUser(devUser);
      setIsAdmin(true);
      setLoading(false);
      return () => {};
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const adminStatus = await checkIsAdmin(user.uid);
          setIsAdmin(adminStatus);
        } catch (error) {
          console.error('Error checking admin status in AuthContext:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    isAdmin,
    loading,
    signup,
    login,
    logout,
    googleSignIn,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
