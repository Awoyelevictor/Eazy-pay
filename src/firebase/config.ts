import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase configuration using environment variables.
 * 
 * To enable LIVE mode:
 * 1. Go to your Firebase Console.
 * 2. Add a Web App to get your configuration.
 * 3. Add these values as Environment Variables in your project settings/secrets.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// A valid API key usually starts with "AIza"
const isConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIza");

// Fallback configuration for development/demo purposes
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
  : initializeApp(isConfigValid ? firebaseConfig : demoConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
