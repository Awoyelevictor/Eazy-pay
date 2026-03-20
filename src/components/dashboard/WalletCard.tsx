"use client";

import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Plus, Loader2, ShieldCheck, Landmark, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser, useDoc, useFirestore } from "@/firebase";
import { doc, setDoc, increment, collection, addDoc, onSnapshot } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { PAYSTACK_PUBLIC_KEY } from "@/firebase/config";
import { createAINotification } from "@/services/notification-service";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

declare global { interface Window { PaystackPop: any; } }

export function WalletCard() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [showBalance, setShowBalance] = useState(true);
  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const { toast } = useToast();

  const [withdrawData, setWithdrawData] = useState({ amount: "", bankName: "", accountNumber: "", pin: "" });

  const userRef = useMemo(() => (firestore && user) ? doc(firestore, "users", user.uid) : null, [firestore, user]);
  
  // Local state for the profile to ensure real-time reactive updates
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Use a direct onSnapshot for maximum reliability and persistence visibility
  useEffect(() => {
    if (!userRef) return;
    const unsub = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      }
      setLoading(false);
    });
    return unsub;
  }, [userRef]);

  const processFundingSuccess = async (reference: string, amount: number) => {
    if (!user || !userRef || !firestore) return;
    try {
      // Use increment for atomic safety
      await setDoc(userRef, { balance: increment(amount) }, { merge: true });
      
      await addDoc(collection(firestore, "users", user.uid, "transactions"), {
        type: "funding",
        amount: amount,
        service: "Wallet Fund (Paystack)",
        status: "success",
        createdAt: new Date().toISOString(),
        reference: reference
      });
      
      createAINotification(firestore, user.uid, `Successfully funded wallet with NGN ${amount.toLocaleString()}`, user.displayName || '');
      toast({ title: "Balance Updated!" });
    } catch (e) {
      toast({ title: "Sync Failed", description: "Payment recorded but local update failed.", variant: "destructive" });
    } finally {
      setIsFunding(false);
    }
  };

  const handleFundWallet = () => {
    if (!user?.email || !window.PaystackPop) {
      toast({ title: "System Readying", description: "Payment gateway initializing...", variant: "destructive" });
      return;
    }
    const amountStr = prompt("Enter amount (₦)", "1000");
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount < 100) {
      toast({ title: "Invalid Amount", description: "Minimum funding is ₦100" });
      return;
    }

    setIsFunding(true);
    try {
      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: PAYSTACK_PUBLIC_KEY,
        email: user.email,
        amount: Math.round(amount * 100),
        onSuccess: (tx: any) => {
          console.log("Paystack Success:", tx);
          processFundingSuccess(tx.reference, amount);
        },
        onCancel: () => setIsFunding(false),
        onError: () => {
          setIsFunding(false);
          toast({ title: "Payment Failed", variant: "destructive" });
        }
      });
    } catch (error) {
      setIsFunding(false);
      toast({ title: "Gateway Error", variant: "destructive" });
    }
  };

  const handleWithdraw = async () => {
    if (!userRef || !profile) return;
    const amount = parseFloat(withdrawData.amount);
    if (isNaN(amount) || amount > (profile.balance || 0)) {
      toast({ title: "Invalid Balance", variant: "destructive" });
      return;
    }
    if (withdrawData.pin !== profile.transactionPin) {
      toast({ title: "Incorrect PIN", variant: "destructive" });
      return;
    }

    setIsWithdrawing(true);
    try {
      await setDoc(userRef, { balance: increment(-amount) }, { merge: true });
      await addDoc(collection(firestore!, "users", user.uid, "transactions"), {
        type: "withdrawal",
        amount: amount,
        service: "Wallet Withdrawal",
        status: "pending",
        createdAt: new Date().toISOString(),
        bankDetails: { bankName: withdrawData.bankName, accountNumber: withdrawData.accountNumber }
      });
      createAINotification(firestore!, user.uid, `Withdrawal of NGN ${amount.toLocaleString()} is processing.`, user.displayName || '');
      toast({ title: "Transfer Initiated" });
      setShowWithdrawDialog(false);
      setWithdrawData({ amount: "", bankName: "", accountNumber: "", pin: "" });
    } catch (error) {
      toast({ title: "Transfer Error", variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  const balance = profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00";

  return (
    <Card className="bg-primary text-primary-foreground rounded-[2.5rem] shadow-2xl relative overflow-hidden">
      <CardContent className="p-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-accent" />
            <p className="text-[10px] font-black uppercase tracking-widest">Secure Live Wallet</p>
          </div>
          <button onClick={() => setShowBalance(!showBalance)} className="opacity-70 hover:opacity-100 transition-opacity">
            {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
        <div className="flex items-baseline gap-2 mb-10">
          <span className="text-2xl font-bold opacity-60">₦</span>
          {loading ? (
            <Skeleton className="h-12 w-48 bg-white/20 rounded-xl animate-pulse" />
          ) : (
            <h2 className="text-5xl font-black tracking-tight">{showBalance ? balance : "****.**"}</h2>
          )}
        </div>
        <div className="flex gap-4">
          <Button className="flex-1 h-14 rounded-2xl bg-accent text-accent-foreground font-black shadow-lg shadow-black/10 transition-transform active:scale-95" onClick={handleFundWallet} disabled={isFunding}>
            {isFunding ? <Loader2 className="animate-spin" /> : <><Plus className="mr-2" /> Fund</>}
          </Button>
          <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 h-14 rounded-2xl bg-white/10 border-white/20 font-black backdrop-blur-sm transition-transform active:scale-95">
                <ArrowLeftRight className="mr-2" /> Withdraw
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-[2.5rem] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Transfer to Bank</DialogTitle>
                <DialogDescription>Your funds will be processed to your local account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Bank Details</Label>
                  <Input placeholder="Bank Name (e.g. GTBank)" value={withdrawData.bankName} onChange={(e) => setWithdrawData({...withdrawData, bankName: e.target.value})} className="h-12 rounded-xl" />
                  <Input placeholder="Account Number" maxLength={10} value={withdrawData.accountNumber} onChange={(e) => setWithdrawData({...withdrawData, accountNumber: e.target.value})} className="h-12 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Transaction Details</Label>
                  <Input type="number" placeholder="Amount (₦)" value={withdrawData.amount} onChange={(e) => setWithdrawData({...withdrawData, amount: e.target.value})} className="h-12 rounded-xl font-bold" />
                  <Input type="password" placeholder="Security PIN" maxLength={6} value={withdrawData.pin} onChange={(e) => setWithdrawData({...withdrawData, pin: e.target.value})} className="h-12 rounded-xl tracking-widest text-center font-black" />
                </div>
                <Button className="w-full h-14 rounded-2xl font-black text-lg mt-2" onClick={handleWithdraw} disabled={isWithdrawing}>
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
