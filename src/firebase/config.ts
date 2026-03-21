import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * 1. FIREBASE CONFIGURATION
 * Find this in: Firebase Console > Project Settings > General > Your Apps
 */
const firebaseConfig = {
  apiKey: "AIzaSyDHZ4KTXXGN3w8o8qjNAvI7bKmNVzyqT-U",
  authDomain: "gen-lang-client-0774757450.firebaseapp.com",
  projectId: "gen-lang-client-0774757450",
  storageBucket: "gen-lang-client-0774757450.firebasestorage.app",
  messagingSenderId: "74718218670",
  appId: "1:74718218670:web:264f7b1516c8386069603f",
  measurementId: "G-31S8D2K21K"
};

/** 
 * 2. PAYSTACK CONFIGURATION (Payments & Wallet Funding)
 * Find this in: Paystack Dashboard > Settings > API Keys & Webhooks
 */
export const PAYSTACK_PUBLIC_KEY = "pk_live_92bf8334a23001695120e2a1eb135c37b83ace52";
export const PAYSTACK_SECRET_KEY = "sk_live_03ae68bc0e27e4b595e18cf9960ce75c22143e21";

/** 
 * 3. VTPASS CONFIGURATION (Airtime, Data, Electricity, Cable)
 * Find this in: VTpass Dashboard > My Account > API Integration
 */
export const VTU_CONFIG = {
  API_KEY: "384e1cf92f291f8bf76dc271e7b9f7fe",
  PUBLIC_KEY: "PK_6161bf9bf5899086dcb620e6d203620d9c9d66c815f",
  SECRET_KEY: "SK_752b182d5d8e844f8723f8678bf52759b40b94c7b9d",
  BASE_URL: "https://vtpass.com/api",
};

/**
 * 4. OTHER PROVIDERS (Gaming & Fallbacks)
 */
export const PAY1ST_CONFIG = {
  API_KEY: "YOUR_CARRY1ST_API_KEY_HERE",
  BASE_URL: "https://api.carry1st.com/v1",
};

export const SHAGO_CONFIG = {
  HASH_KEY: "YOUR_SHAGO_HASH_KEY_HERE", 
  BASE_URL: "https://api.shagopayments.com/public/api/v2",
};

// Initialize Firebase
const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
