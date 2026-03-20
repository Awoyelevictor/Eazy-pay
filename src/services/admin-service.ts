
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
 * Optimized to handle large datasets and security rule restrictions.
 */
export async function getGlobalStats(db: Firestore) {
  try {
    // 1. Fetch all users
    // If this fails with a permission error, it's usually because the admin user
    // hasn't been granted 'list' access on the /users collection in Security Rules.
    const usersSnap = await getDocs(collection(db, 'users')).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: 'users',
        operation: 'list'
      });
      errorEmitter.emit('permission-error', permissionError);
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
    
    // 2. Fetch all transactions for all users in parallel
    const transactionPromises = users.map(async (user: any) => {
      totalBalance += Number(user.balance) || 0;
      
      try {
        const txSnap = await getDocs(collection(db, 'users', user.id, 'transactions'));
        const userTxs = txSnap.docs.map(d => ({ id: d.id, userId: user.id, ...d.data() }));
        allTransactions.push(...userTxs);
      } catch (e) {
        // If we can't see a specific user's transactions, we skip it for the aggregate
        // but log the error contextually if needed.
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
  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    const promises = usersSnap.docs.map(u => 
      createAINotification(db, u.id, description, u.data().displayName || 'User', '')
    );
    await Promise.all(promises);
  } catch (err) {
    console.error("Admin: Broadcast failed", err);
    throw err;
  }
}
