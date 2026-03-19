'use client';

import { 
  Firestore, 
  collection, 
  getDocs, 
  query, 
  where,
  getDoc,
  doc
} from 'firebase/firestore';
import { createAINotification } from './notification-service';

/**
 * Fetch aggregated statistics for the admin dashboard.
 * Optimized to use parallel fetching for subcollections.
 */
export async function getGlobalStats(db: Firestore) {
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (users.length === 0) {
      return {
        userCount: 0,
        transactionCount: 0,
        totalVolume: 0,
        activeBalance: 0,
        successRate: '0%',
        transactions: [],
        users: []
      };
    }

    let totalBalance = 0;
    
    // Fetch all transactions in parallel to avoid long execution times
    const transactionPromises = users.map(async (user) => {
      totalBalance += (user as any).balance || 0;
      const txSnap = await getDocs(collection(db, 'users', user.id, 'transactions'));
      return txSnap.docs.map(d => ({ id: d.id, userId: user.id, ...d.data() }));
    });

    const results = await Promise.all(transactionPromises);
    const allTransactions = results.flat();

    const successTx = allTransactions.filter(t => t.status === 'success');
    const totalVolume = successTx.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
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
  } catch (error) {
    console.error("Global Stats Fetch Error:", error);
    throw error;
  }
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
