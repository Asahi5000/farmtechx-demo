import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyDa-...",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "layaspinas-dev.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "layaspinas-dev",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "layaspinas-dev.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "23891001",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:23891001:web:12abc",
};

// We will run this via node with the actual env vars from the file
import dotenv from 'dotenv';
dotenv.config();

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function check() {
  console.log("Fetching coming_soon municipalities...");
  const q = query(collection(db, 'municipalities'), where('status', '==', 'coming_soon'));
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    console.log("No coming_soon municipalities found.");
    return;
  }
  
  console.log(`Found ${snapshot.docs.length}. First doc:`);
  console.log(JSON.stringify(snapshot.docs[0].data(), null, 2));
}

check().catch(console.error);
