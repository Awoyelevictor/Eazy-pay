
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, query, where, limit } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDHZ4KTXXGN3w8o8qjNAvI7bKmNVzyqT-U",
  authDomain: "gen-lang-client-0774757450.firebaseapp.com",
  projectId: "gen-lang-client-0774757450",
  storageBucket: "gen-lang-client-0774757450.firebasestorage.app",
  messagingSenderId: "74718218670",
  appId: "1:74718218670:web:264f7b1516c8386069603f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function extract() {
  const userId = "oLeqacIvfSdQlWHWXwM3q61valJ3";
  const txRef = collection(db, "users", userId, "transactions");
  const q = query(txRef, where("status", "==", "success"));
  
  const snap = await getDocs(q);
  const data = snap.docs.map(doc => doc.data());
  process.stdout.write(JSON.stringify(data, null, 2));
  process.exit(0);
}

extract().catch(e => {
  console.error(e);
  process.exit(1);
});
