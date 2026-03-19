
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M" },
  { name: "Glo", color: "bg-green-500", logo: "G" },
  { name: "Airtel", color: "bg-red-500", logo: "A" },
  { name: "9mobile", color: "bg-emerald-800", logo: "9" },
];

export default function AirtimePurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef) return;
    
    if (!selectedNetwork || !phoneNumber || !amount) {
      toast({
        title: "Incomplete Details",
        description: "Please select a network, enter a number, and specify an amount.",
        variant: "destructive",
      });
      return;
    }

    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount < 100) {
      toast({
        title: "Minimum Amount",
        description: "Minimum airtime purchase is ₦100.",
        variant: "destructive",
      });
      return;
    }

    if (profile && profile.balance < purchaseAmount) {
      toast({
        title: "Insufficient Balance",
        description: "Please fund your wallet. You need ₦" + (purchaseAmount - profile.balance) + " more.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    // SIMULATED VTU API CALL
    // In production, you would use 'fetch' to call your VTU provider's API here.
    // e.g. await fetch('https://api.vtu-provider.com/buy', { method: 'POST', body: ... })
    await new Promise(resolve => setTimeout(resolve, 2000));

    const transactionData = {
      type: "airtime",
      amount: purchaseAmount,
      network: selectedNetwork,
      recipient: phoneNumber,
      status: "success",
      deliveryStatus: "simulated", // Marks that this was a test delivery
      createdAt: new Date().toISOString(),
    };

    // 1. Deduct from balance
    updateDoc(userRef, {
      balance: increment(-purchaseAmount)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { balance: increment(-purchaseAmount) },
      }));
    });

    // 2. Add transaction record
    const transactionsRef = collection(firestore, "users", user.uid, "transactions");
    addDoc(transactionsRef, transactionData)
      .then(() => {
        setIsProcessing(false);
        setIsSuccess(true);
      })
      .catch(async () => {
        setIsProcessing(false);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: transactionsRef.path,
          operation: 'create',
          requestResourceData: transactionData,
        }));
      });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Balance Deducted</h1>
        <p className="text-muted-foreground mb-4 max-w-xs mx-auto">
          ₦{parseFloat(amount).toLocaleString()} has been removed from your wallet for {phoneNumber}.
        </p>
        <Card className="bg-amber-50 border-amber-200 mb-10 max-w-xs mx-auto rounded-2xl">
          <CardContent className="p-4 flex items-start gap-3 text-left">
            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
            <p className="text-[10px] text-amber-800 font-medium">
              <span className="font-bold">Note:</span> This is a simulated delivery. Real airtime was not sent because a VTU API is not yet connected to your project.
            </p>
          </CardContent>
        </Card>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => {
            setIsSuccess(false);
            setAmount("");
            setPhoneNumber("");
          }}>
            New Purchase
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full rounded-2xl h-14 text-lg font-bold border-secondary">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <h1 className="text-xl font-black">Buy Airtime</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-xl mx-auto">
        <AlertTriangle className="text-amber-600 mx-auto" size={32} />
        <div className="text-center space-y-2">
           <h2 className="text-lg font-black text-amber-600">Development Mode</h2>
           <p className="text-xs text-muted-foreground">Purchases will deduct real wallet balance but use a simulated network delivery.</p>
        </div>

        {/* Network Selection */}
        <section>
          <Label className="text-sm font-bold mb-4 block text-muted-foreground uppercase tracking-wider">Select Network</Label>
          <div className="grid grid-cols-4 gap-4">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => setSelectedNetwork(net.name)}
                className={`flex flex-col items-center gap-3 group p-3 rounded-3xl transition-all duration-300 ${
                  selectedNetwork === net.name 
                    ? "bg-primary/10 ring-2 ring-primary shadow-lg" 
                    : "bg-white border border-secondary hover:border-primary/40 shadow-sm"
                }`}
              >
                <div className={`h-14 w-14 rounded-2xl ${net.color} flex items-center justify-center text-white font-black text-2xl shadow-md group-hover:scale-110 transition-transform`}>
                  {net.logo}
                </div>
                <span className="text-[11px] font-bold text-foreground/80">{net.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recipient Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="080 0000 0000"
              className="h-16 rounded-2xl bg-white border-secondary/80 focus-visible:ring-primary text-lg font-bold px-6 shadow-sm"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="amount" className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Amount (₦)</Label>
            <div className="relative">
               <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-lg text-muted-foreground">₦</span>
               <Input
                id="amount"
                type="number"
                placeholder="500"
                className="h-16 rounded-2xl bg-white border-secondary/80 focus-visible:ring-primary text-lg font-bold pl-12 pr-6 shadow-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
        </section>

        <Card className="bg-primary/5 border-none shadow-none rounded-[2rem]">
          <CardContent className="p-6 flex gap-4 text-primary">
            <Info size={24} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium leading-relaxed">
              <p>Wallet Balance: <span className="font-black">₦{profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</span></p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-70" 
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" /> Authorizing...
            </div>
          ) : "Confirm Purchase"}
        </Button>
      </main>
    </div>
  );
}
