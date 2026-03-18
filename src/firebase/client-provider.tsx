
'use client';

import React from 'react';
import { app, auth, db } from './config';
import { FirebaseProvider } from './provider';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <FirebaseProvider app={app} auth={auth} firestore={db}>
      {children}
    </FirebaseProvider>
  );
}
