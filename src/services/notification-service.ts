
'use client';

import { Firestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { composeNotification } from '@/ai/flows/compose-notification-flow';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/**
 * Service to handle notification creation with AI-composed messages.
 */
export async function createAINotification(
  db: Firestore,
  userId: string,
  eventDescription: string,
  userName?: string,
  actionUrl?: string
) {
  try {
    // 1. Compose the notification content using AI
    const aiContent = await composeNotification({ eventDescription, userName });

    // 2. Save to Firestore
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    const notificationData = {
      ...aiContent,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: actionUrl || '',
    };

    addDoc(notificationsRef, notificationData).catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: notificationsRef.path,
        operation: 'create',
        requestResourceData: notificationData,
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  } catch (error) {
    console.error('Failed to create AI notification:', error);
    // Fallback to a basic notification if AI fails
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    addDoc(notificationsRef, {
      title: 'Update from Eazy-pay',
      message: eventDescription,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
}
