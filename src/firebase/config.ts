import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration using environment variables.
 * 
 * TO MAKE IT LIVE:
 * 1. Go to your Firebase Console (console.firebase.google.com).
 * 2. Create or select a project.
 * 3. Add a Web App to get your configuration.
 * 4. Add these values as Environment Variables in your project settings.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Check if the provided API key is valid (must start with AIza)
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIza");

// Fallback "Demo" configuration to prevent the SDK from crashing on boot
// while the user is still setting up their environment.
const demoConfig = {
  apiKey: "AIzaSyDemoProjectKey_PleaseReplaceWithRealKey",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

if (!isConfigValid && typeof window !== 'undefined') {
  console.warn(
    "FyreVTU: Firebase API Key is missing or invalid. Using demo mode. " +
    "To enable LIVE transactions and authentication, please connect your Firebase project."
  );
}

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(isConfigValid ? firebaseConfig : demoConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
