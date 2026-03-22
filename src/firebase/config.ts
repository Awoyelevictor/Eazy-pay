import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * 1. FIREBASE CONFIGURATION
 * Find this in: Firebase Console > Project Settings > General > Your Apps
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

/** 
 * 2. PAYSTACK CONFIGURATION (Payments & Wallet Funding)
 * Dashboard: https://dashboard.paystack.com/
 */
export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

/** 
 * 3. VTPASS CONFIGURATION (Airtime, Data, Electricity, Cable)
 * Dashboard: https://www.vtpass.com/rest-api
 */
export const VTU_CONFIG = {
  API_KEY: process.env.VTPASS_API_KEY,
  PUBLIC_KEY: process.env.NEXT_PUBLIC_VTPASS_PUBLIC_KEY,
  SECRET_KEY: process.env.VTPASS_SECRET_KEY,
  BASE_URL: "https://vtpass.com/api",
};

/**
 * 4. OTHER PROVIDERS (Gaming & Fallbacks)
 */
export const PAY1ST_CONFIG = {
  API_KEY: process.env.PAY1ST_API_KEY,
  BASE_URL: "https://api.carry1st.com/v1",
};

export const SHAGO_CONFIG = {
  HASH_KEY: process.env.SHAGO_HASH_KEY, 
  BASE_URL: "https://api.shagopayments.com/public/api/v2",
};

export const SMEPLUG_CONFIG = {
  SECRET_KEY: process.env.SMEPLUG_SECRET_KEY,
  BASE_URL: "https://smeplug.ng/api/v1",
};

// Initialize Firebase
const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
