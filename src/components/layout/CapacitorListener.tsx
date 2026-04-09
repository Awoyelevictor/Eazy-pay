'use client';

import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';

export function CapacitorListener() {
  const router = useRouter();

  useEffect(() => {
    // Only run on native platforms
    if (!Capacitor.isNativePlatform()) return;

    const setupListener = async () => {
      // Handle app opened via URL (Deep Link)
      App.addListener('appUrlOpen', (data) => {
        console.log('App opened with URL:', data.url);
        
        try {
          // Parse the URL (e.g., eazypay://quick-buy)
          const url = new URL(data.url);
          const path = url.pathname || url.hostname;
          
          if (path === 'quick-buy') {
            router.push('/dashboard?action=quick-buy');
          } else if (path === 'ai-chat') {
            router.push('/dashboard?action=ai-chat');
          }
        } catch (e) {
          console.error('Failed to parse deep link URL', e);
        }
      });

      // Handle back button on Android
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });
    };

    setupListener();

    return () => {
      App.removeAllListeners();
    };
  }, [router]);

  return null;
}
