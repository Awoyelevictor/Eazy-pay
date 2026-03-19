
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search, UserCircle, Zap, Loader2, AlertCircle } from "lucide-react";
import { WalletCard } from "@/components/dashboard/WalletCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { AIQuickBuy } from "@/components/dashboard/AIQuickBuy";
import { BottomNav } from "@/components/layout/BottomNav";
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationDrawer } from "@/components/notifications/NotificationDrawer";

export default function DashboardPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary h-12 w-12" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-6 shadow-inner">
          <Zap size={40} className="fill-primary" />
        </div>
        <h1 className="text-4xl font-black mb-2">Eazy-pay</h1>
        <p className="text-muted-foreground mb-10 max-w-xs font-medium">
          Fast, secure, and reliable mobile & gaming top-ups.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Link href="/auth/login" className="block">
            <Button className="w-full rounded-2xl h-16 text-xl font-black shadow-xl shadow-primary/20">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/signup" className="block">
            <Button variant="outline" className="w-full rounded-2xl h-16 text-xl font-black border-secondary">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/profile">
            <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-primary/20 cursor-pointer hover:scale-105 transition-transform">
               {user.photoURL ? (
                 <img src={user.photoURL} alt={user.displayName || "User"} className="h-full w-full object-cover" />
               ) : (
                 <UserCircle className="text-primary h-full w-full" />
               )}
            </div>
          </Link>
          <div>
            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest leading-none mb-1">Welcome back,</p>
            <p className="text-sm font-bold">{user.displayName || user.email?.split('@')[0] || "User"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center transition-colors">
            <Search size={20} className="text-muted-foreground" />
          </button>
          <NotificationDrawer />
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
            <p className="text-sm opacity-90 mb-4 font-medium">Get extra credits on CODM & Free Fire top-ups this weekend.</p>
            <Link href="/services/games">
              <button className="bg-foreground text-background px-4 py-2 rounded-full text-xs font-bold shadow-md hover:scale-105 transition-transform">
                Get Credits
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
