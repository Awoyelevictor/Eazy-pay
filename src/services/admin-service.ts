
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
    // 1. Fetch all users - This is usually where the permission error happens if rules are restricted.
    const usersSnap = await getDocs(collection(db, 'users')).catch(async (err) => {
      // If we can't list users, it's a security rule violation for an admin.
      const permissionError = new FirestorePermissionError({
        path: 'users',
        operation: 'list'
      });
      errorEmitter.emit('permission-error', permissionError);
      throw err;
    });

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (users.length === 0) {
      console.log("Admin: No users found in the system.");
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
    
    // 2. Fetch all transactions in parallel for each found user
    const transactionPromises = users.map(async (user) => {
      const userData = user as any;
      totalBalance += Number(userData.balance) || 0;
      
      try {
        const txSnap = await getDocs(collection(db, 'users', user.id, 'transactions'));
        const userTxs = txSnap.docs.map(d => ({ id: d.id, userId: user.id, ...d.data() }));
        allTransactions.push(...userTxs);
      } catch (e) {
        // Log individual user fetch failures silently to let the rest of the dashboard load
        console.warn(`Admin: Could not fetch transactions for user ${user.id} - check rules for /users/{userId}/transactions`);
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
    // Re-throw so the UI knows to show the error state
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
