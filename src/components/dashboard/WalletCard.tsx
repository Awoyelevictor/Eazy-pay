
"use client";

import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Plus, ArrowUpRight, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc, setDoc, updateDoc, increment, collection, addDoc } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from "@/hooks/use-toast";
import { PAYSTACK_PUBLIC_KEY } from "@/firebase/config";
import { createAINotification } from "@/services/notification-service";

declare global {
  interface Window {
    PaystackPop: any;
  }
}

export function WalletCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [showBalance, setShowBalance] = useState(true);
  const [isFunding, setIsFunding] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile, loading } = useDoc(userRef);

  useEffect(() => {
    if (user && !profile && !loading && firestore && userRef) {
      const initialData = {
        displayName: user.displayName || "User",
        email: user.email || "",
        balance: 0,
        phoneNumber: user.phoneNumber || "",
        createdAt: new Date().toISOString()
      };
      
      setDoc(userRef, initialData, { merge: true })
        .then(() => {
           createAINotification(firestore, user.uid, "Welcome to Eazy-pay! Your live wallet is now active.", user.displayName || '');
        })
        .catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: userRef.path,
            operation: 'create',
            requestResourceData: initialData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
  }, [user, profile, loading, firestore, userRef]);

  const handleFundWallet = async () => {
    if (!user || !firestore || !userRef) return;
    
    const amountStr = prompt("Enter amount to fund in NGN (Min ₦100)", "1000");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 100) {
      toast({ title: "Minimum funding is ₦100", variant: "destructive" });
      return;
    }

    setIsFunding(true);

    try {
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round(amount * 100), // Paystack works in kobo
        currency: "NGN",
        callback: async function (response: any) {
          try {
            // 1. Update balance in Firestore
            await updateDoc(userRef, {
              balance: increment(amount)
            });

            // 2. Add transaction record
            const transactionData = {
              type: "funding",
              amount: amount,
              service: "Wallet Fund (Paystack)",
              status: "success",
              createdAt: new Date().toISOString(),
              reference: response.reference
            };

            const transactionsRef = collection(firestore, "users", user.uid, "transactions");
            await addDoc(transactionsRef, transactionData);

            // 3. Create AI Notification
            await createAINotification(
              firestore, 
              user.uid, 
              `Successfully funded wallet with NGN ${amount.toLocaleString()} via Paystack`,
              user.displayName || ''
            );

            toast({ 
              title: "Funding Successful!", 
              description: `₦${amount.toLocaleString()} has been added to your balance.`,
            });
          } catch (e) {
            console.error("Funding Callback Error:", e);
          } finally {
            setIsFunding(false);
          }
        },
        onClose: function () {
          setIsFunding(false);
          toast({ title: "Payment Cancelled", variant: "destructive" });
        },
      });
      handler.openIframe();
    } catch (error) {
      setIsFunding(false);
      toast({ 
        title: "Connection Error", 
        description: "Could not connect to Paystack gateway.", 
        variant: "destructive" 
      });
    }
  };

  const balanceFormatted = profile?.balance?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) || "0.00";

  return (
    <Card className="bg-primary text-primary-foreground overflow-hidden relative shadow-2xl border-none rounded-[2.5rem] transition-transform hover:scale-[1.01]">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <WalletSVG size={140} />
      </div>
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            <p className="text-primary-foreground/80 text-[10px] font-black uppercase tracking-[0.2em]">Secure Live Wallet</p>
          </div>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:bg-white/10 rounded-full p-2 transition-colors">
            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="flex items-baseline gap-2 mb-10">
          <span className="text-2xl font-bold opacity-60">₦</span>
          <h2 className="text-5xl font-black tracking-tight">
            {loading ? <Loader2 className="animate-spin h-8 w-8" /> : (showBalance ? balanceFormatted : "****.**")}
          </h2>
        </div>
        <div className="flex gap-4">
          <Button 
            className="flex-1 h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-lg font-black text-lg transition-all active:scale-95"
            onClick={handleFundWallet}
            disabled={isFunding}
          >
            {isFunding ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-6 w-6" />} Fund Wallet
          </Button>
          <Button variant="outline" className="flex-1 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-md font-black text-lg transition-all active:scale-95">
            <ArrowUpRight className="mr-2 h-6 w-6" /> Transfer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function WalletSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      <circle cx="16" cy="15" r="1" />
    </svg>
  );
}
