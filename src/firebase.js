// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'AIzaSyCLYCakRQjCm79aVMnsq_y9FexM-fPvzdY',
  authDomain: 'producthubapp-8bd3d.firebaseapp.com',
  projectId: 'producthubapp-8bd3d',
  storageBucket: 'producthubapp-8bd3d.firebasestorage.app',
  messagingSenderId: '68845647852',
  appId: '1:68845647852:web:3748805982479a97b32c9',
  measurementId: 'G-FVESCZ23T2'
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);