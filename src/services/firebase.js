import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

import {
  getFirestore,
  enableIndexedDbPersistence,
} from "firebase/firestore";

import {
  getDatabase
} from "firebase/database";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA2lIHytOx-Wv-HzHwlDW7QY1d0Wi4yPaM",
  authDomain: "chatapplication-87b43.firebaseapp.com",
  projectId: "chatapplication-87b43",
  storageBucket: "chatapplication-87b43.firebasestorage.app",
  messagingSenderId: "380297100736",
  appId: "1:380297100736:web:5019b1e6bbbf074db51c25",
  measurementId: "G-VS558FHW6W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDB = getDatabase(app);

// 🔥 ENABLE OFFLINE CACHE
enableIndexedDbPersistence(firestore).catch(console.log);
