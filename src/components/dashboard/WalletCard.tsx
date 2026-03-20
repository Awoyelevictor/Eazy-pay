"use client";

import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Plus, ArrowUpRight, Loader2, ShieldCheck, Landmark, ArrowLeftRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc, setDoc, updateDoc, increment, collection, addDoc } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from "@/hooks/use-toast";
import { PAYSTACK_PUBLIC_KEY } from "@/firebase/config";
import { createAINotification } from "@/services/notification-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const { toast } = useToast();

  const [withdrawData, setWithdrawData] = useState({
    amount: "",
    bankName: "",
    accountNumber: "",
    pin: ""
  });

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
    
    // Ensure PaystackPop is available on the window
    if (!window.PaystackPop) {
      toast({
        title: "Connection Error",
        description: "Paystack script is not loaded yet. Please wait a moment.",
        variant: "destructive"
      });
      return;
    }

    const amountStr = prompt("Enter amount to fund in NGN (Min ₦100)", "1000");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 100) {
      toast({ title: "Minimum funding is ₦100", variant: "destructive" });
      return;
    }

    setIsFunding(true);

    try {
      const reference = `EP-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      
      const handler = window.PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round(amount * 100),
        currency: "NGN",
        ref: reference,
        callback: async (response: any) => {
          try {
            // Update Firestore Balance
            await updateDoc(userRef, {
              balance: increment(amount)
            });

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

            await createAINotification(
              firestore, 
              user.uid, 
              `Successfully funded wallet with NGN ${amount.toLocaleString()} via Paystack`,
              user.displayName || ''
            );

            toast({ 
              title: "Funding Successful!", 
              description: `₦${amount.toLocaleString()} added to your balance.`,
            });
          } catch (e) {
            console.error("Funding UI Update Error:", e);
          } finally {
            setIsFunding(false);
          }
        },
        onClose: () => {
          setIsFunding(false);
          toast({ title: "Payment Cancelled", description: "The payment window was closed." });
        }
      });

      handler.openIframe();
    } catch (error) {
      setIsFunding(false);
      console.error("Paystack Initialization Error:", error);
      toast({ 
        title: "Gateway Error", 
        description: "Could not launch Paystack. Check your internet connection.", 
        variant: "destructive" 
      });
    }
  };

  const handleWithdraw = async () => {
    if (!user || !firestore || !userRef || !profile) return;
    
    const amount = parseFloat(withdrawData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid Amount", variant: "destructive" });
      return;
    }

    if (amount > profile.balance) {
      toast({ title: "Insufficient Balance", description: "You cannot withdraw more than your current balance.", variant: "destructive" });
      return;
    }

    if (!profile.transactionPin || withdrawData.pin !== profile.transactionPin) {
      toast({ title: "Incorrect PIN", description: "Please enter your correct security PIN.", variant: "destructive" });
      return;
    }

    setIsWithdrawing(true);

    try {
      await updateDoc(userRef, {
        balance: increment(-amount)
      });

      const transactionData = {
        type: "withdrawal",
        amount: amount,
        service: "Wallet Withdrawal",
        status: "pending",
        createdAt: new Date().toISOString(),
        bankDetails: {
          bankName: withdrawData.bankName,
          accountNumber: withdrawData.accountNumber
        }
      };

      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);

      await createAINotification(
        firestore,
        user.uid,
        `Withdrawal of NGN ${amount.toLocaleString()} to ${withdrawData.bankName} (${withdrawData.accountNumber}) is being processed.`,
        user.displayName || ''
      );

      toast({
        title: "Withdrawal Requested",
        description: `₦${amount.toLocaleString()} will be sent to your bank account soon.`,
      });

      setWithdrawData({ amount: "", bankName: "", accountNumber: "", pin: "" });
      setShowWithdrawDialog(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const balanceFormatted = profile?.balance?.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) || "0.00";

  return (
    <Card className="bg-primary text-primary-foreground overflow-hidden relative shadow-2xl border-none rounded-[2.5rem] transition-all hover:shadow-primary/30">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <WalletSVG size={140} />
      </div>
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            <p className="text-primary-foreground/80 text-[10px] font-black uppercase tracking-[0.2em]">Live Wallet Account</p>
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

          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-md font-black text-lg transition-all active:scale-95">
                <ArrowLeftRight className="mr-2 h-6 w-6" /> Transfer
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                   <Landmark className="text-primary" /> Withdraw Funds
                </DialogTitle>
                <DialogDescription className="font-medium">Transfer funds from your Eazy-pay wallet to your bank.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Bank Name</Label>
                  <Input 
                    placeholder="e.g. UBA, Kuda"
                    className="h-12 rounded-xl"
                    value={withdrawData.bankName}
                    onChange={(e) => setWithdrawData({...withdrawData, bankName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <Input 
                    placeholder="10 Digits"
                    maxLength={10}
                    className="h-12 rounded-xl"
                    value={withdrawData.accountNumber}
                    onChange={(e) => setWithdrawData({...withdrawData, accountNumber: e.target.value.replace(/\D/g, '')})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₦)</Label>
                  <Input 
                    type="number"
                    placeholder="0.00"
                    className="h-12 rounded-xl font-bold"
                    value={withdrawData.amount}
                    onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground font-bold px-1">Current Balance: ₦{balanceFormatted}</p>
                </div>
                <div className="space-y-2">
                  <Label>Transaction PIN</Label>
                  <Input 
                    type="password"
                    placeholder="••••"
                    maxLength={6}
                    className="h-12 rounded-xl tracking-[1em] text-center font-bold"
                    value={withdrawData.pin}
                    onChange={(e) => setWithdrawData({...withdrawData, pin: e.target.value.replace(/\D/g, '')})}
                  />
                </div>
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-lg mt-4 shadow-xl shadow-primary/20" 
                  onClick={handleWithdraw}
                  disabled={isWithdrawing || !withdrawData.amount || !withdrawData.pin}
                >
                  {isWithdrawing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2" /> Complete Transfer</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
