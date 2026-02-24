import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '.env.local') });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log('--- PROVINCES ---');
  const pQ = query(collection(db, 'provinces'), where('name', '==', 'Camarines Norte'));
  const pSnap = await getDocs(pQ);
  pSnap.forEach(doc => {
    console.log('Camarines Norte Document ID:', doc.id);
    console.log('Camarines Norte name:', doc.data().name);
  });

  console.log('\n--- MUNICIPALITIES ---');
  const mQ = query(collection(db, 'municipalities'), where('name', '==', 'Daet'));
  const mSnap = await getDocs(mQ);
  mSnap.forEach(doc => {
    console.log('Daet Document ID:', doc.id);
    console.log('Daet name:', doc.data().name);
    console.log('Daet provinceId field value:', doc.data().provinceId);
  });
  
  process.exit(0);
}

check().catch(console.error);
