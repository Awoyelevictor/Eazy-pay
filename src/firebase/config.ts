import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration using environment variables.
 * These are injected automatically when you connect a real Firebase project.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Check if we have valid production keys. 
// A real API key starts with "AIza".
export const IS_LIVE_MODE = 
  !!firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== "undefined" && 
  firebaseConfig.apiKey.startsWith("AIza");

// Fallback configuration for demo purposes to prevent crashes
const demoConfig = {
  apiKey: "AIzaDemoConfig_PleaseConnectRealProject",
  authDomain: "fyrevtu-demo.firebaseapp.com",
  projectId: "fyrevtu-demo",
  storageBucket: "fyrevtu-demo.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(IS_LIVE_MODE ? firebaseConfig : demoConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
