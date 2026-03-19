
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Wifi, Smartphone } from "lucide-react";
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
  { name: "MTN", color: "bg-yellow-400", logo: "M", vtuId: "mtn-data" },
  { name: "Glo", color: "bg-green-600", logo: "G", vtuId: "glo-data" },
  { name: "Airtel", color: "bg-red-600", logo: "A", vtuId: "airtel-data" },
  { name: "9mobile", color: "bg-emerald-900", logo: "9", vtuId: "etisalat-data" },
];

const networkBundles: Record<string, any[]> = {
  "MTN": [
    { variation: "mtn-100mb-1000", name: "1.5GB / 30 Days", amount: 1000 },
    { variation: "mtn-500mb-2000", name: "4.5GB / 30 Days", amount: 2000 },
    { variation: "mtn-data-3000", name: "8GB / 30 Days", amount: 3000 },
  ],
  "Airtel": [
    { variation: "airt-1000", name: "1.5GB / 30 Days", amount: 1000 },
    { variation: "airt-2000", name: "4.5GB / 30 Days", amount: 2000 },
  ],
  "Glo": [
    { variation: "glo1000", name: "2.5GB / 30 Days", amount: 1000 },
    { variation: "glo2000", name: "5.8GB / 30 Days", amount: 2000 },
  ],
  "9mobile": [
    { variation: "eti-1000", name: "1.5GB / 30 Days", amount: 1000 },
  ]
};

export default function DataPurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedNetwork, setSelectedNetwork] = useState<typeof networks[0] | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  const availableBundles = useMemo(() => {
    if (!selectedNetwork) return [];
    return networkBundles[selectedNetwork.name] || [];
  }, [selectedNetwork]);

  const generateRequestId = () => {
    return Date.now().toString() + Math.random().toString(36).substring(2, 7);
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedBundle || !selectedNetwork) return;
    
    if (profile && profile.balance < selectedBundle.amount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = generateRequestId();
      const result = await processPayment({
        request_id: requestId,
        serviceID: selectedNetwork.vtuId,
        billersCode: phoneNumber,
        variation_code: selectedBundle.variation,
        amount: selectedBundle.amount,
        phone: phoneNumber
      });

      if (result.code !== '000') {
        throw new Error(result.response_description || "Subscription failed");
      }

      const transactionData = {
        type: "data",
        amount: selectedBundle.amount,
        network: selectedNetwork.name,
        recipient: phoneNumber,
        service: selectedBundle.name,
        status: "success",
        requestId: requestId,
        createdAt: new Date().toISOString(),
      };

      await updateDoc(userRef, { balance: increment(-selectedBundle.amount) });
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);
      
      // AI Notification
      createAINotification(
        firestore,
        user.uid,
        `Successfully subscribed ${selectedBundle.name} for ${phoneNumber} on ${selectedNetwork.name}`,
        user.displayName || ''
      );

      setIsSuccess(true);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
        <h1 className="text-3xl font-black mb-3">Data Sent!</h1>
        <p className="text-muted-foreground mb-8">{selectedBundle?.name} sent to {phoneNumber}.</p>
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
        <h1 className="text-xl font-black">Buy Data</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-xl mx-auto pb-24">
        <section>
          <Label className="text-xs font-black mb-4 block text-muted-foreground uppercase tracking-widest">1. Select Network</Label>
          <div className="grid grid-cols-4 gap-3">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => { setSelectedNetwork(net); setSelectedBundle(null); }}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all ${
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

        {selectedNetwork && (
          <section className="space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Recipient Number</Label>
              <Input
                type="tel"
                placeholder="080 0000 0000"
                className="h-16 rounded-2xl font-bold"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Select Bundle</Label>
              <div className="grid gap-3">
                {availableBundles.map((b) => (
                  <button
                    key={b.variation}
                    onClick={() => setSelectedBundle(b)}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                      selectedBundle?.variation === b.variation ? "bg-primary/5 border-primary" : "bg-white border-secondary"
                    }`}
                  >
                    <span className="font-bold text-sm">{b.name}</span>
                    <span className="font-black text-primary">₦{b.amount}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl" 
          onClick={handlePurchase}
          disabled={isProcessing || !selectedBundle}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : "Subscribe Now"}
        </Button>
      </main>
    </div>
  );
}
