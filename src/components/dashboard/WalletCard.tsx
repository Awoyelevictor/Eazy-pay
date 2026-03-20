"use client";

import { useState, useMemo } from "react";
import { Eye, EyeOff, Plus, Loader2, ShieldCheck, Landmark, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc, setDoc, increment, collection, addDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PAYSTACK_PUBLIC_KEY } from "@/firebase/config";
import { createAINotification } from "@/services/notification-service";
import { Skeleton } from "@/components/ui/skeleton";
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

  const processFundingSuccess = async (reference: string, amount: number) => {
    if (!user || !firestore || !userRef) return;

    try {
      // Use setDoc with merge and increment for guaranteed persistence
      await setDoc(userRef, {
        balance: increment(amount)
      }, { merge: true });

      const transactionData = {
        type: "funding",
        amount: amount,
        service: "Wallet Fund (Paystack)",
        status: "success",
        createdAt: new Date().toISOString(),
        reference: reference
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
    } catch (e: any) {
      console.error("Funding Success Processing Error:", e);
      toast({ title: "Update Failed", description: "Payment was successful but balance update failed. Check internet connection.", variant: "destructive" });
    } finally {
      setIsFunding(false);
    }
  };

  const handleFundWallet = () => {
    if (!user || !firestore || !userRef || !user.email) return;
    
    if (!window.PaystackPop) {
      toast({
        title: "Gateway Offline",
        description: "Payment system is initializing. Please wait 5 seconds and retry.",
        variant: "destructive"
      });
      return;
    }

    const amountStr = prompt("Enter amount to fund (₦)", "1000");
    if (!amountStr) return;
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 100) {
      toast({ title: "Min ₦100 required", variant: "destructive" });
      return;
    }

    setIsFunding(true);

    try {
      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round(amount * 100),
        onSuccess: (transaction: any) => {
          processFundingSuccess(transaction.reference, amount);
        },
        onCancel: () => {
          setIsFunding(false);
        },
        onError: (error: any) => {
          setIsFunding(false);
          toast({ title: "Payment Error", description: "Could not initiate transaction.", variant: "destructive" });
        }
      });
    } catch (error) {
      setIsFunding(false);
      toast({ 
        title: "Gateway Error", 
        description: "Paystack initialization failed.", 
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

    if (amount > (profile.balance || 0)) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    if (!profile.transactionPin || withdrawData.pin !== profile.transactionPin) {
      toast({ title: "Incorrect Security PIN", variant: "destructive" });
      return;
    }

    setIsWithdrawing(true);

    try {
      await setDoc(userRef, {
        balance: increment(-amount)
      }, { merge: true });

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
        `Withdrawal of NGN ${amount.toLocaleString()} is processing.`,
        user.displayName || ''
      );

      toast({
        title: "Transfer Initiated",
        description: "Funds will be settled to your bank shortly.",
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
            <p className="text-primary-foreground/80 text-[10px] font-black uppercase tracking-[0.2em]">Secure Live Wallet</p>
          </div>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:bg-white/10 rounded-full p-2 transition-colors">
            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="flex items-baseline gap-2 mb-10">
          <span className="text-2xl font-bold opacity-60">₦</span>
          {loading ? (
            <Skeleton className="h-12 w-48 bg-white/20 rounded-xl" />
          ) : (
            <h2 className="text-5xl font-black tracking-tight">
              {showBalance ? balanceFormatted : "****.**"}
            </h2>
          )}
        </div>
        <div className="flex gap-4">
          <Button 
            className="flex-1 h-14 rounded-2xl bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-lg font-black text-lg transition-all active:scale-95"
            onClick={handleFundWallet}
            disabled={isFunding}
          >
            {isFunding ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-6 w-6" />} Fund
          </Button>

          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-md font-black text-lg transition-all active:scale-95">
                <ArrowLeftRight className="mr-2 h-6 w-6" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black flex items-center gap-2">
                   <Landmark className="text-primary" /> Transfer to Bank
                </DialogTitle>
                <DialogDescription className="font-medium">Move your Eazy-pay funds back to your bank account.</DialogDescription>
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
                  <p className="text-[10px] text-muted-foreground font-bold px-1">Available: ₦{balanceFormatted}</p>
                </div>
                <div className="space-y-2">
                  <Label>Security PIN</Label>
                  <Input 
                    type="password"
                    placeholder="••••••"
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
                  {isWithdrawing ? <Loader2 className="animate-spin" /> : <><CheckCircle2 className="mr-2" /> Complete Withdrawal</>}
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
