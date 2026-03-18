
"use client";

import { Bell, Search, UserCircle, Wifi, LogIn } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { AIQuickBuy } from "@/components/dashboard/AIQuickBuy";
import { BottomNav } from "@/components/layout/BottomNav";
import { useUser, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, loading } = useUser();
  const auth = useAuth();

  const handleLogin = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-6">
          <LogIn size={32} />
        </div>
        <h1 className="text-2xl font-black mb-2">Welcome to FyreVTU</h1>
        <p className="text-muted-foreground mb-8 max-w-xs">
          Sign in to access your wallet, buy airtime, and manage your subscriptions instantly.
        </p>
        <Button onClick={handleLogin} className="w-full max-w-xs rounded-full h-12 text-lg font-bold">
          Sign In with Google
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-primary/20">
             {user.photoURL ? (
               <img src={user.photoURL} alt={user.displayName || "User"} className="h-full w-full object-cover" />
             ) : (
               <UserCircle className="text-primary h-full w-full" />
             )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium">Welcome back,</p>
            <p className="text-sm font-bold">{user.displayName || "User"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Search size={20} className="text-muted-foreground" />
          </button>
          <button className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors relative">
            <Bell size={20} className="text-muted-foreground" />
            <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-red-500 rounded-full border-2 border-background" />
          </button>
        </div>
      </header>

      <main className="px-6 py-6 max-w-4xl mx-auto space-y-8">
        {/* Wallet Section */}
        <section>
          <WalletCard />
        </section>

        {/* AI Quick Buy */}
        <section>
          <AIQuickBuy />
        </section>

        {/* Quick Actions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Services</h2>
            <button className="text-primary text-sm font-medium">View all</button>
          </div>
          <QuickActions />
        </section>

        {/* Promotions/Banners */}
        <section className="bg-accent rounded-3xl p-6 text-accent-foreground flex items-center justify-between overflow-hidden relative shadow-lg">
          <div className="relative z-10 max-w-[60%]">
            <h3 className="text-xl font-black mb-1">Double Data!</h3>
            <p className="text-sm opacity-90 mb-4">Get 2x data on every Airtel top-up above ₦2,000 this weekend.</p>
            <button className="bg-foreground text-background px-4 py-2 rounded-full text-xs font-bold shadow-md hover:scale-105 transition-transform">
              Claim Now
            </button>
          </div>
          <div className="absolute right-0 bottom-0 opacity-20">
             <WifiIcon size={140} className="rotate-12" />
          </div>
        </section>

        {/* Transactions Section */}
        <section>
          <TransactionList />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}

function WifiIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}
