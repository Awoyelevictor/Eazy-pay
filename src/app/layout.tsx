import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import Script from "next/script";

export const metadata: Metadata = {
  title: 'Eazy-pay - Instant Mobile & Game Top-up',
  description: 'Fast, secure, and reliable top-up for airtime, data, and game credits.',
};

import { CapacitorListener } from "@/components/layout/CapacitorListener";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
        {/* Paystack Inline Script - Placed in Head for maximum reliability */}
        <Script 
          src="https://js.paystack.co/v2/inline.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="font-body antialiased bg-background" suppressHydrationWarning>
        <FirebaseClientProvider>
          <CapacitorListener />
          {children}
          <Toaster />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
