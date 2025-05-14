// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyCLeCkRQjCm79aVMnsq_y9FexM-Fpvdy",
  authDomain: "producthubapp-8bd3d.firebaseapp.com",
  projectId: "producthubapp-8bd3d",
  storageBucket: "producthubapp-8bd3d.firebasestorage.app",
  messagingSenderId: "68845647852",
  appId: "1:68845647852:web:37488059824797a97b2c9",
  measurementId: "G-FVESC22J72"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

