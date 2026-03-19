import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/**
 * Production Firebase configuration for Eazy-pay.
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

// Paystack Public Key for live transactions
export const PAYSTACK_PUBLIC_KEY = "pk_live_92bf8334a23001695120e2a1eb135c37b83ace52";

/** 
 * VTPASS API CONFIGURATION (Airtime, Data, Utilities)
 */
export const VTU_CONFIG = {
  API_KEY: "384e1cf92f291f8bf76dc271e7b9f7fe",
  PUBLIC_KEY: "PK_6161bf9bf5899086dcb620e6d203620d9c9d66c815f",
  SECRET_KEY: "SK_752b182d5d8e844f8723f8678bf52759b40b94c7b9d",
  BASE_URL: "https://vtpass.com/api",
};

/**
 * PAY1ST / CARRY1ST GATEWAY CONFIGURATION (Specifically for Gaming)
 */
export const PAY1ST_CONFIG = {
  API_KEY: "PAY1ST_API_KEY_HERE",
  BASE_URL: "https://api.carry1st.com/v1", // Using Carry1st Shop Gateway as requested
};

/**
 * SHAGO PAYMENTS CONFIGURATION (Fallback)
 */
export const SHAGO_CONFIG = {
  HASH_KEY: "SHAGO_HASH_KEY_HERE", 
  BASE_URL: "https://api.shagopayments.com/public/api/v2",
};

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
