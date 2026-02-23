import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, limit, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'municipalities'), where('name', '==', 'Basud'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("No municipality found");
    return;
  }
  
  const data = snap.docs[0].data();
  console.log("=== fields for Base ===");
  console.log(Object.keys(data).sort().join('\n'));
  console.log("\nRatings fields present?:");
  console.log("rating:", data.rating);
  console.log("averageRating:", data.averageRating);
  process.exit(0);
}

check().catch(console.error);
