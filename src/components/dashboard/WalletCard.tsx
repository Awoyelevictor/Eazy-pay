"use client";

import { useState, useMemo, useEffect } from "react";
import { Eye, EyeOff, Plus, Loader2, ShieldCheck, Landmark, ArrowLeftRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPaystackBanks, processPaystackWithdrawal } from "@/app/actions/paystack";
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

  const [withdrawData, setWithdrawData] = useState({ amount: "", bankCode: "", accountNumber: "", pin: "" });
  const [banks, setBanks] = useState<{name: string, code: string}[]>([]);

  const userRef = useMemo(() => (firestore && user) ? doc(firestore, "users", user.uid) : null, [firestore, user]);
  
  // Local state for the profile to ensure real-time reactive updates
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load Paystack banks natively on component mount
  useEffect(() => {
    getPaystackBanks().then(setBanks).catch(e => console.error("Could not load banks:", e));
  }, []);

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
        category: "revenue",  // ← Mark as REVENUE (money users deposit)
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
    
    if (isNaN(amount) || amount > (profile.balance || 0) || amount < 100) {
      toast({ title: "Invalid Balance", description: "Insufficient funds or below ₦100 limit.", variant: "destructive" });
      return;
    }
    if (withdrawData.pin !== profile.transactionPin) {
      toast({ title: "Incorrect PIN", variant: "destructive" });
      return;
    }
    if (!withdrawData.bankCode || withdrawData.accountNumber.length < 10) {
      toast({ title: "Invalid Details", description: "Ensure bank is selected and 10 digit NUBAN is entered.", variant: "destructive" });
      return;
    }

    setIsWithdrawing(true);
    try {
      // 1. Call Secure Paystack Servers to Automatically Send Money 
      await processPaystackWithdrawal({
        amount,
        bankCode: withdrawData.bankCode,
        accountNumber: withdrawData.accountNumber,
        reason: `Eazy-pay Withdrawal for ${user.email}`
      });

      // 2. ONLY if Paystack initialized it successfully, deduct their wallet balance
      await setDoc(userRef, { balance: increment(-amount) }, { merge: true });
      await addDoc(collection(firestore!, "users", user.uid, "transactions"), {
        type: "withdrawal",
        amount: amount,
        service: "Direct Transfer",
        status: "success",
        createdAt: new Date().toISOString(),
        bankDetails: { bankCode: withdrawData.bankCode, accountNumber: withdrawData.accountNumber }
      });
      createAINotification(firestore!, user.uid, `You instantly withdrew NGN ${amount.toLocaleString()} directly to your bank account.`, user.displayName || '');
      toast({ title: "Money Sent!", description: "Check your local bank account alert shortly!" });
      setShowWithdrawDialog(false);
      setWithdrawData({ amount: "", bankCode: "", accountNumber: "", pin: "" });
    } catch (error: any) {
      const errorMsg = error.message?.toLowerCase() || "";
      
      // Check for Paystack starter business limitation
      if (errorMsg.includes("starter") || errorMsg.includes("payout")) {
        toast({ 
          title: "Account Upgrade Required", 
          description: "Your Paystack account is a Starter Business and cannot process payouts yet. You need to upgrade to SME or higher tier. Visit https://dashboard.paystack.co/settings/business to upgrade.",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Transfer Rejected", description: error.message || "Paystack declined the transaction details.", variant: "destructive" });
      }
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
            <div className="flex-1 group relative" title="Withdrawals are available once your Paystack account is upgraded">
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full h-14 rounded-2xl bg-white/10 border-white/20 font-black backdrop-blur-sm transition-transform active:scale-95 opacity-50 cursor-not-allowed">
                  <ArrowLeftRight className="mr-2" /> Withdraw (Coming Soon)
                </Button>
              </DialogTrigger>
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Requires Paystack SME upgrade
              </div>
            </div>
            <DialogContent className="rounded-[2.5rem] sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Transfer to Bank</DialogTitle>
                <DialogDescription>Your funds will be processed to your local account.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Bank Details</Label>
                  <Select value={withdrawData.bankCode} onValueChange={(val) => setWithdrawData({...withdrawData, bankCode: val})}>
                    <SelectTrigger className="h-12 rounded-xl border-none bg-slate-100 font-bold dark:bg-slate-800">
                      <SelectValue placeholder={banks.length > 0 ? "Select Destination Bank" : "Loading Banks..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {banks.map((b, i) => (
                        <SelectItem key={i + b.code} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="10 Digit Account Number" maxLength={10} value={withdrawData.accountNumber} onChange={(e) => setWithdrawData({...withdrawData, accountNumber: e.target.value})} className="h-12 rounded-xl text-lg font-black tracking-widest" />
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
