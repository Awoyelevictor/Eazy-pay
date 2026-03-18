'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = errorEmitter.on('permission-error', (error: FirestorePermissionError) => {
      // In a real app, this might show a developer overlay in dev mode
      // or a user-friendly toast in production.
      console.error('Security Rule Violation Context:', error.context);
      
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: `You do not have permission to ${error.context.operation} at ${error.context.path}.`,
      });

      // Rethrow to trigger the Next.js error boundary/overlay if in development
      if (process.env.NODE_ENV === 'development') {
        throw error;
      }
    });

    return unsubscribe;
  }, [toast]);

  return null;
}
