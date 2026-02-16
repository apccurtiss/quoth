import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC7PDzwQkNyE8u6JHVkJWMjX14a9pFWRj4",
  authDomain: "quoth-4160d.firebaseapp.com",
  projectId: "quoth-4160d",
  storageBucket: "quoth-4160d.firebasestorage.app",
  messagingSenderId: "19634906470",
  appId: "1:19634906470:web:03746f75b92927b2e514a7",
  measurementId: "G-KC06PD0S0R",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
