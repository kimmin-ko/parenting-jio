import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDk40EB9Dp7MuoOO2ih6KpSNvc7cUQcBKg',
  authDomain: 'parenting-jio.firebaseapp.com',
  databaseURL: 'https://parenting-jio-default-rtdb.firebaseio.com',
  projectId: 'parenting-jio',
  storageBucket: 'parenting-jio.firebasestorage.app',
  messagingSenderId: '311493913831',
  appId: '1:311493913831:web:ac1e796c8fc99e11440642',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getDatabase(app);
