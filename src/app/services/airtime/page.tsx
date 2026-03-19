
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { processPayment } from "@/app/actions/vtpass";
import { createAINotification } from "@/services/notification-service";

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M", vtuId: "mtn" },
  { name: "Glo", color: "bg-green-500", logo: "G", vtuId: "glo" },
  { name: "Airtel", color: "bg-red-500", logo: "A", vtuId: "airtel" },
  { name: "9mobile", color: "bg-emerald-800", logo: "9", vtuId: "etisalat" },
];

export default function AirtimePurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedNetwork, setSelectedNetwork] = useState<typeof networks[0] | null>(null);
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

  const generateRequestId = () => {
    const now = new Date();
    const dateStr = now.getFullYear() + 
                    (now.getMonth() + 1).toString().padStart(2, "0") + 
                    now.getDate().toString().padStart(2, "0") + 
                    now.getHours().toString().padStart(2, "0") + 
                    now.getMinutes().toString().padStart(2, "0");
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000); // 7 random digits
    return `${dateStr}${randomDigits}`;
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef) return;
    
    if (!selectedNetwork || !phoneNumber || !amount) {
      toast({ title: "Incomplete Details", variant: "destructive" });
      return;
    }

    const purchaseAmount = parseFloat(amount);
    if (isNaN(purchaseAmount) || purchaseAmount < 100) {
      toast({ title: "Minimum Amount ₦100", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < purchaseAmount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = generateRequestId();
      
      const result = await processPayment({
        request_id: requestId,
        serviceID: selectedNetwork.vtuId,
        amount: purchaseAmount,
        phone: phoneNumber
      });

      if (result.code !== '000') {
        throw new Error(result.response_description || "Transaction failed");
      }

      // 1. Deduct balance
      await updateDoc(userRef, { balance: increment(-purchaseAmount) });

      // 2. Log transaction
      const transactionData = {
        type: "airtime",
        amount: purchaseAmount,
        network: selectedNetwork.name,
        recipient: phoneNumber,
        status: "success",
        requestId: requestId,
        createdAt: new Date().toISOString(),
      };
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);
      
      // 3. Notify user with AI message (Awaited for reliability)
      await createAINotification(
        firestore, 
        user.uid, 
        `Successfully purchased NGN ${purchaseAmount} ${selectedNetwork.name} airtime for ${phoneNumber}`,
        user.displayName || ''
      );

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Purchase Error:", error);
      toast({
        title: "Purchase Error",
        description: error.message,
        variant: "destructive"
      });
      
      // Notify about failure (Awaited for reliability)
      await createAINotification(
        firestore, 
        user.uid, 
        `Airtime purchase of NGN ${amount} failed: ${error.message}`,
        user.displayName || ''
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Airtime Sent!</h1>
        <p className="text-muted-foreground mb-8">₦{amount} sent to {phoneNumber}.</p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14" onClick={() => setIsSuccess(false)}>Buy More</Button>
          <Link href="/dashboard" className="block"><Button variant="outline" className="w-full rounded-2xl h-14">Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft size={24} /></Button></Link>
        <h1 className="text-xl font-black">Buy Airtime</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-xl mx-auto">
        <section>
          <Label className="text-xs font-black mb-4 block text-muted-foreground uppercase tracking-widest">Select Network</Label>
          <div className="grid grid-cols-4 gap-4">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => setSelectedNetwork(net)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  selectedNetwork?.name === net.name ? "bg-primary/5 border-primary" : "bg-white border-secondary"
                }`}
              >
                <div className={`h-12 w-12 rounded-xl ${net.color} flex items-center justify-center text-white font-black text-xl`}>
                  {net.logo}
                </div>
                <span className="text-[10px] font-bold">{net.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Recipient Number</Label>
            <Input
              type="tel"
              placeholder="080 0000 0000"
              className="h-16 rounded-2xl font-bold text-lg"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Amount (₦)</Label>
            <Input
              type="number"
              placeholder="500"
              className="h-16 rounded-2xl font-bold text-lg"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
        </section>

        <Card className="bg-primary/5 border-none rounded-[2rem]">
          <CardContent className="p-6 flex gap-4 text-primary">
            <Info size={24} className="flex-shrink-0" />
            <div className="text-sm font-medium">
              <p>Wallet Balance: <span className="font-black">₦{profile?.balance?.toLocaleString() || "0.00"}</span></p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl" 
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : "Purchase Now"}
        </Button>
      </main>
    </div>
  );
}
