import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  linkWithPopup,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '@/services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  linkGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: true,
  linkGoogle: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else {
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error('Anonymous sign-in failed:', error);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAnonymous = user?.isAnonymous ?? true;

  async function linkGoogle() {
    if (!auth.currentUser) return;
    await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAnonymous, linkGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}
