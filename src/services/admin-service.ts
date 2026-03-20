'use client';

import { 
  Firestore, 
  collection, 
  getDocs, 
  query, 
  where,
  getDoc,
  doc,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { createAINotification } from './notification-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Fetch aggregated statistics for the admin dashboard.
 * Optimized for parallel fetching and better error handling.
 */
export async function getGlobalStats(db: Firestore) {
  try {
    // Attempt to list all users. This requires 'list' permissions in Security Rules.
    const usersSnap = await getDocs(collection(db, 'users')).catch(async (err) => {
      console.error("Admin Service: Permission Denied to list users collection.", err);
      const permissionError = new FirestorePermissionError({
        path: 'users',
        operation: 'list'
      });
      errorEmitter.emit('permission-error', permissionError);
      throw new Error("Access Denied: Your account does not have permission to list the 'users' collection. Please check your Firestore Security Rules.");
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
    
    // Fetch transaction sub-collections in parallel for all users
    const transactionPromises = users.map(async (userDoc: any) => {
      totalBalance += Number(userDoc.balance) || 0;
      
      try {
        const txSnap = await getDocs(collection(db, 'users', userDoc.id, 'transactions'));
        const userTxs = txSnap.docs.map(d => ({ 
          id: d.id, 
          userId: userDoc.id, 
          userEmail: userDoc.email, 
          ...d.data() 
        }));
        allTransactions.push(...userTxs);
      } catch (e) {
        // We warn but don't fail the whole process if one user's tx list is restricted
        console.warn(`Admin Service: Restricted access to transactions for user ${userDoc.id}`);
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
      transactions: allTransactions.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
      users: users.sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0))
    };
  } catch (error: any) {
    console.error("Global Stats Aggregate Failure:", error);
    throw error;
  }
}

/**
 * Manually update a user's balance from the admin panel.
 */
export async function adminUpdateUserBalance(
  db: Firestore, 
  userId: string, 
  newBalance: number,
  adminReason: string
) {
  const userRef = doc(db, 'users', userId);
  
  await updateDoc(userRef, { balance: newBalance });
  
  // Log the manual adjustment
  await addDoc(collection(db, 'users', userId, 'transactions'), {
    type: 'funding',
    amount: newBalance,
    service: 'Admin Manual Credit',
    status: 'success',
    createdAt: new Date().toISOString(),
    adminNote: adminReason
  });

  await createAINotification(
    db,
    userId,
    `Admin has manually updated your balance to ₦${newBalance.toLocaleString()}. Reason: ${adminReason}`,
    'System'
  );
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
