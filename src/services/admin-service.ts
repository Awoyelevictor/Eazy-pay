'use client';

import { 
  Firestore, 
  collection, 
  getDocs, 
  addDoc, 
  writeBatch, 
  query, 
  where,
  getDoc,
  doc
} from 'firebase/firestore';
import { createAINotification } from './notification-service';

/**
 * Fetch aggregated statistics for the admin dashboard.
 */
export async function getGlobalStats(db: Firestore) {
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  let totalBalance = 0;
  let allTransactions: any[] = [];

  // This is a heavy operation for an MVP, but necessary for global stats
  // In a real production app, we would use Firebase Extensions or Cloud Functions
  // to maintain these counters in a single 'stats' document.
  for (const user of users) {
    totalBalance += (user as any).balance || 0;
    const txSnap = await getDocs(collection(db, 'users', user.id, 'transactions'));
    allTransactions.push(...txSnap.docs.map(d => d.data()));
  }

  const successTx = allTransactions.filter(t => t.status === 'success');
  const totalVolume = successTx.reduce((acc, t) => acc + (t.amount || 0), 0);
  const successRate = allTransactions.length > 0 
    ? ((successTx.length / allTransactions.length) * 100).toFixed(1) + '%' 
    : '100%';

  return {
    userCount: users.length,
    transactionCount: allTransactions.length,
    totalVolume,
    activeBalance: totalBalance,
    successRate,
    transactions: allTransactions,
    users
  };
}

/**
 * Broadcast a notification to all registered users.
 */
export async function broadcastGlobalNotification(
  db: Firestore, 
  description: string,
  adminName: string
) {
  const usersSnap = await getDocs(collection(db, 'users'));
  const promises = usersSnap.docs.map(u => 
    createAINotification(db, u.id, `Announcement from Admin ${adminName}: ${description}`, 'Eazy-pay User')
  );
  await Promise.all(promises);
}
