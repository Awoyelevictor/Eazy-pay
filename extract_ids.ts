
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, limit } from "firebase/firestore";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

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

async function getRequestIds() {
  const userId = "oLeqacIvfSdQlWHWXwM3q61valJ3"; // Admin UID from prev steps
  const txRef = collection(db, "users", userId, "transactions");
  const q = query(txRef, where("status", "==", "success"), limit(50));
  
  const snap = await getDocs(q);
  console.log("Found " + snap.size + " successful transactions.");
  
  const results: any = {};
  
  snap.forEach(doc => {
    const data = doc.data();
    const key = `${data.type}_${data.network}`.toLowerCase();
    if (!results[key]) results[key] = [];
    results[key].push({
      requestId: data.requestId,
      service: data.service,
      amount: data.amount,
      date: data.createdAt
    });
  });
  
  console.log(JSON.stringify(results, null, 2));
}

getRequestIds().catch(console.error);
