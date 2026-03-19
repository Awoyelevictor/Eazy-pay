
"use client";

import { Bell, Search, UserCircle, Zap } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { AIQuickBuy } from "@/components/dashboard/AIQuickBuy";
import { BottomNav } from "@/components/layout/BottomNav";
import { useUser, useAuth } from "@/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unexpected error occurred during sign-in. Please ensure Google Auth is enabled.",
      });
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
        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-inner">
          <Zap size={40} className="fill-primary" />
        </div>
        <h1 className="text-3xl font-black mb-2">Eazy-pay</h1>
        <p className="text-muted-foreground mb-8 max-w-xs font-medium">
          Sign in to access your wallet and instant gaming top-ups.
        </p>
        <Button onClick={handleLogin} className="w-full max-w-xs rounded-2xl h-14 text-lg font-bold shadow-xl shadow-primary/20">
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
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">Welcome back,</p>
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
        <section>
          <WalletCard />
        </section>

        <section>
          <AIQuickBuy />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Services</h2>
            <Link href="/services" className="text-primary text-sm font-medium">View all</Link>
          </div>
          <QuickActions />
        </section>

        <section className="bg-accent rounded-3xl p-6 text-accent-foreground flex items-center justify-between overflow-hidden relative shadow-lg">
          <div className="relative z-10 max-w-[60%]">
            <h3 className="text-xl font-black mb-1">Gamer's Choice!</h3>
            <p className="text-sm opacity-90 mb-4 font-medium">Get extra Diamonds on Free Fire top-ups above ₦1,000 this weekend.</p>
            <Link href="/services/games">
              <button className="bg-foreground text-background px-4 py-2 rounded-full text-xs font-bold shadow-md hover:scale-105 transition-transform">
                Get Diamonds
              </button>
            </Link>
          </div>
          <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
             <Zap size={160} className="rotate-12 fill-accent-foreground" />
          </div>
        </section>

        <section>
          <TransactionList />
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
