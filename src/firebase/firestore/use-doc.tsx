
'use client';

import { useState, useEffect } from 'react';
import { DocumentReference, onSnapshot } from 'firebase/firestore';

export function useDoc(ref: DocumentReference | null | undefined) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (doc) => {
        setData(doc.exists() ? { id: doc.id, ...doc.data() } : null);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [ref]);

  return { data, loading, error };
}
