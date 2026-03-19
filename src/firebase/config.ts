
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
 * VTU PROVIDER CONFIGURATION
 * VTpass API Integration Keys
 */
export const VTU_CONFIG = {
  API_KEY: "your_actual_vtpass_api_key",
  PUBLIC_KEY: "your_actual_vtpass_public_key",
  BASE_URL: "https://vtpass.com/api", // Switch to https://sandbox.vtpass.com/api for testing
};

const app = getApps().length > 0 
  ? getApp() 
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
