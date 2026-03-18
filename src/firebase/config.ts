import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration using environment variables.
 * To fix the "API Key not valid" error:
 * 1. Go to Firebase Console > Project Settings.
 * 2. Copy the config object for your Web App.
 * 3. Add these values as Environment Variables in your project settings.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Handle cases where env vars might be missing during the "live" transition
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSy_PLACEHOLDER";

if (!isConfigValid && typeof window !== 'undefined') {
  console.warn(
    "Firebase API Key is missing or invalid. Please set your NEXT_PUBLIC_FIREBASE_API_KEY " +
    "in your environment variables to enable live features."
  );
}

const app = getApps().length > 0 ? getApp() : initializeApp(isConfigValid ? firebaseConfig : {
  apiKey: "MISSING_KEY",
  authDomain: "localhost",
  projectId: "demo-project",
  storageBucket: "localhost",
  messagingSenderId: "00000000",
  appId: "0:0:web:0"
});

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
