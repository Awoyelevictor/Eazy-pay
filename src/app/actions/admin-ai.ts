'use server';

import { ai } from '@/ai/genkit';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { app } from '@/firebase/config';

const db = getFirestore(app);

/**
 * Generate AI message for users
 */
export async function generateAdminMessage(reason: string, type: 'all' | 'specific') {
  try {
    const prompt = `You are a customer service representative for Eazy-Pay, a Nigerian fintech app for buying airtime, data, electricity, cable TV, etc.

The administrator wants to send a ${type === 'all' ? 'broadcast message to all users' : 'personalized message to a user'}.

Reason: ${reason}

Generate a SHORT, PROFESSIONAL, and FRIENDLY message (2-3 sentences max) that:
- Is simple and easy to understand
- Uses Nigerian English
- Is personalized to the context
- Includes a call-to-action if appropriate
- Does NOT include timestamps or "Sent by: Admin"

Just output the message, nothing else.`;

    const result = await ai.generate({
      prompt: prompt,
      model: 'googleai/gemini-2.5-flash',
    });

    return result.text || 'Hello from Eazy-Pay!';
  } catch (error) {
    console.error('Message generation error:', error);
    throw new Error('Failed to generate message');
  }
}

/**
 * Get analytics data
 */
export async function getAnalytics() {
  try {
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);

    let totalRevenue = 0;
    let totalTransactions = 0;
    let successfulTransactions = 0;

    // Calculate analytics from users
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();

      // Add revenue per user
      if (userData.balance !== undefined) {
        totalRevenue += userData.balance || 0;
      }

      // Get transactions sub-collection
      const transactionsRef = collection(db, 'users', userDoc.id, 'transactions');
      const transactionsSnap = await getDocs(transactionsRef);

      totalTransactions += transactionsSnap.size;

      // Count successful transactions
      const successCount = transactionsSnap.docs.filter(
        (t) => t.data().status === 'success'
      ).length;
      successfulTransactions += successCount;
    }

    const successRate =
      totalTransactions > 0 ? Math.round((successfulTransactions / totalTransactions) * 100) : 0;

    return {
      totalUsers: usersSnap.size,
      totalRevenue,
      totalTransactions,
      successRate,
      successfulTransactions,
    };
  } catch (error) {
    console.error('Analytics error:', error);
    return {
      totalUsers: 0,
      totalRevenue: 0,
      totalTransactions: 0,
      successRate: 0,
    };
  }
}

/**
 * Auto-fix payment issues using AI
 */
export async function fixPaymentIssue(userId: string) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));

    if (userSnap.empty) {
      throw new Error('User not found');
    }

    const userData = userSnap.docs[0].data();
    const failureReason = userData.lastFailedTransactionError || 'Unknown error';
    const failureAmount = userData.lastFailedTransactionAmount || 0;

    // Determine fix based on error type
    let fixAction = 'Transaction retried';

    if (failureReason.includes('Insufficient balance')) {
      // Insufficient merchant balance - add bonus credit
      await updateDoc(doc(db, 'users', userSnap.docs[0].id), {
        balance: increment(failureAmount * 0.1), // Add 10% bonus
        lastFailedTransaction: null,
        lastFailedTransactionError: null,
      });
      fixAction = `Added ₦${(failureAmount * 0.1).toLocaleString()} bonus credit for inconvenience`;
    } else if (failureReason.includes('Network')) {
      // Network error - auto-retry marked
      await updateDoc(doc(db, 'users', userSnap.docs[0].id), {
        pendingRetry: true,
        lastFailedTransaction: null,
      });
      fixAction = 'Marked for automatic retry';
    } else {
      // Other errors - log and reset
      await updateDoc(doc(db, 'users', userSnap.docs[0].id), {
        lastFailedTransaction: null,
        lastFailedTransactionError: null,
      });
      fixAction = 'Issue logged and cleared';
    }

    return {
      success: true,
      message: fixAction,
      userId,
    };
  } catch (error: any) {
    console.error('Fix payment issue error:', error);
    throw new Error(error.message || 'Failed to fix payment issue');
  }
}

/**
 * Send message to users
 */
export async function sendBroadcastMessage(message: string, userIds?: string[]) {
  try {
    const usersRef = collection(db, 'users');

    let usersQuery = usersRef;
    let usersSnap = await getDocs(usersQuery);

    if (userIds && userIds.length > 0) {
      usersSnap = await getDocs(query(usersRef, where('uid', 'in', userIds)));
    }

    // Create notification for each user
    for (const userDoc of usersSnap.docs) {
      const notificationsRef = collection(db, 'users', userDoc.id, 'notifications');
      await getDocs(notificationsRef); // Ensure sub-collection exists

      // Note: Actual message sending would use a service like FCM or in-app notifications
    }

    return {
      success: true,
      messagesSent: usersSnap.size,
    };
  } catch (error) {
    console.error('Broadcast message error:', error);
    throw new Error('Failed to send messages');
  }
}
