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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Fetch aggregated statistics for the admin dashboard.
 * Optimized to aggregate data across all users and handle permission errors.
 */
export async function getGlobalStats(db: Firestore) {
  try {
    const usersSnap = await getDocs(collection(db, 'users')).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'users',
        operation: 'list'
      }));
      throw err;
    });

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (users.length === 0) {
      return {
        userCount: 0,
        transactionCount: 0,
        totalVolume: 0,
        activeBalance: 0,
        successRate: '100%',
        transactions: [],
        users: []
      };
    }

    let totalBalance = 0;
    const allTransactions: any[] = [];
    
    // Fetch all transactions in parallel
    const transactionPromises = users.map(async (user) => {
      const userData = user as any;
      totalBalance += Number(userData.balance) || 0;
      
      try {
        const txSnap = await getDocs(collection(db, 'users', user.id, 'transactions'));
        const userTxs = txSnap.docs.map(d => ({ id: d.id, userId: user.id, ...d.data() }));
        allTransactions.push(...userTxs);
      } catch (e) {
        // Log individual user fetch failures silently to let the rest of the dashboard load
        console.warn(`Admin: Could not fetch transactions for user ${user.id}`);
      }
    });

    await Promise.all(transactionPromises);

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
  } catch (error: any) {
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
