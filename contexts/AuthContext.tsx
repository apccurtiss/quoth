import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  linkWithPopup,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import { getUserNickname, setUserNickname } from '@/services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  nickname: string;
  linkGoogle: () => Promise<void>;
  updateNickname: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: true,
  nickname: '',
  linkGoogle: async () => {},
  updateNickname: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNicknameState] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const existing = await getUserNickname(firebaseUser.uid);
        if (existing) {
          setNicknameState(existing);
        } else if (firebaseUser.displayName) {
          await setUserNickname(firebaseUser.uid, firebaseUser.displayName);
          setNicknameState(firebaseUser.displayName);
        }
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
    const result = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
    // Auto-set nickname from Google display name if not already set
    if (result.user.displayName && !nickname) {
      await setUserNickname(result.user.uid, result.user.displayName);
      setNicknameState(result.user.displayName);
    }
  }

  async function updateNickname(name: string) {
    if (!auth.currentUser) return;
    await setUserNickname(auth.currentUser.uid, name);
    setNicknameState(name);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, isAnonymous, nickname, linkGoogle, updateNickname }}
    >
      {children}
    </AuthContext.Provider>
  );
}
