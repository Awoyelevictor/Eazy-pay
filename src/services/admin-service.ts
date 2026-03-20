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
  addDoc,
  limit,
  setDoc,
  increment
} from 'firebase/firestore';
import { createAINotification } from './notification-service';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Fetch aggregated statistics for the admin dashboard.
 */
export async function getGlobalStats(db: Firestore) {
  try {
    const usersSnap = await getDocs(collection(db, 'users')).catch(async (err) => {
      console.error("Admin Service: Permission Denied to list users.", err);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'users',
        operation: 'list'
      }));
      throw err;
    });

    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    let totalBalance = 0;
    const allTransactions: any[] = [];
    
    const transactionPromises = users.map(async (userDoc: any) => {
      totalBalance += Number(userDoc.balance) || 0;
      try {
        const txSnap = await getDocs(collection(db, 'users', userDoc.id, 'transactions'));
        allTransactions.push(...txSnap.docs.map(d => ({ id: d.id, userId: userDoc.id, ...d.data() })));
      } catch (e) {
        // Silent catch for individual user transactions if restricted
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
 * Specific function to find a user by email if the global list fails (bypasses list permission).
 */
export async function findUserByEmail(db: Firestore, email: string) {
  if (!email) return null;
  const q = query(collection(db, 'users'), where('email', '==', email.trim()), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
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
  
  // Update doc with persistence
  await setDoc(userRef, { balance: Number(newBalance) }, { merge: true });
  
  // Log the correction
  await addDoc(collection(db, 'users', userId, 'transactions'), {
    type: 'funding',
    amount: Number(newBalance),
    service: 'System Correction',
    status: 'success',
    createdAt: new Date().toISOString(),
    adminNote: adminReason,
    aiGenerated: false
  });

  await createAINotification(
    db,
    userId,
    `System balance adjustment: ₦${newBalance.toLocaleString()}. Reason: ${adminReason}`,
    'Admin'
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
  const usersSnap = await getDocs(collection(db, 'users'));
  const promises = usersSnap.docs.map(u => 
    createAINotification(db, u.id, description, u.data().displayName || 'User', '')
  );
  await Promise.all(promises);
}
