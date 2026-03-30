import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInAnonymously,
  linkWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from '@/services/firebase';
import {
  getUserNickname,
  setUserNickname,
  getAutoShareWith,
  addAutoShareFriend as firestoreAddFriend,
  removeAutoShareFriend as firestoreRemoveFriend,
} from '@/services/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAnonymous: boolean;
  nickname: string;
  autoShareWith: string[];
  linkGoogle: () => Promise<void>;
  updateNickname: (name: string) => Promise<void>;
  addAutoShareFriend: (uid: string) => Promise<void>;
  removeAutoShareFriend: (uid: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAnonymous: true,
  nickname: '',
  autoShareWith: [],
  linkGoogle: async () => {},
  updateNickname: async () => {},
  addAutoShareFriend: async () => {},
  removeAutoShareFriend: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [nickname, setNicknameState] = useState('');
  const [autoShareWith, setAutoShareWithState] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const [existing, autoShare] = await Promise.all([
          getUserNickname(firebaseUser.uid),
          getAutoShareWith(firebaseUser.uid),
        ]);
        setAutoShareWithState(autoShare);
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
    let resultUser;
    try {
      const result = await linkWithPopup(auth.currentUser, new GoogleAuthProvider());
      resultUser = result.user;
    } catch (error: any) {
      // Google account already linked to another (anonymous) session — sign in directly
      if (error.code === 'auth/credential-already-in-use') {
        const credential = GoogleAuthProvider.credentialFromError(error);
        if (!credential) throw error;
        const result = await signInWithCredential(auth, credential);
        resultUser = result.user;
      } else {
        throw error;
      }
    }
    // Auto-set nickname from Google display name if not already set
    if (resultUser.displayName && !nickname) {
      await setUserNickname(resultUser.uid, resultUser.displayName);
      setNicknameState(resultUser.displayName);
    }
  }

  async function updateNickname(name: string) {
    if (!auth.currentUser) return;
    await setUserNickname(auth.currentUser.uid, name);
    setNicknameState(name);
  }

  async function addAutoShareFriend(uid: string) {
    if (!auth.currentUser) return;
    await firestoreAddFriend(auth.currentUser.uid, uid);
    setAutoShareWithState((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
  }

  async function removeAutoShareFriend(uid: string) {
    if (!auth.currentUser) return;
    await firestoreRemoveFriend(auth.currentUser.uid, uid);
    setAutoShareWithState((prev) => prev.filter((id) => id !== uid));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAnonymous,
        nickname,
        autoShareWith,
        linkGoogle,
        updateNickname,
        addAutoShareFriend,
        removeAutoShareFriend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
