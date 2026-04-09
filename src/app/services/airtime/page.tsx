"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { processPeyflexAirtime, getPeyflexAirtimeNetworks } from "@/app/actions/peyflex";
import { getSMEPlugNetworkId } from "@/lib/network";
import { createAINotification } from "@/services/notification-service";

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M" },
  { name: "Glo", color: "bg-green-500", logo: "G" },
  { name: "Airtel", color: "bg-red-500", logo: "A" },
  { name: "9mobile", color: "bg-emerald-800", logo: "9" },
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
  // Dynamic network ID map fetched from SMEPlug (can be T1/T2 strings or numbers)
  const networkIdMap = useRef<Record<string, number | string>>({});

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  // Fetch real network IDs from Peyflex
  useEffect(() => {
    getPeyflexAirtimeNetworks()
      .then(res => {
        console.log("Peyflex networks raw:", JSON.stringify(res).slice(0, 600));
        const list: any[] = Array.isArray(res) ? res
          : Array.isArray(res?.data) ? res.data
          : Array.isArray(res?.networks) ? res.networks
          : [];
        const map: Record<string, number | string> = {};
        for (const net of list) {
          // Preserve raw ID — could be "T1", "T2" or 1, 2
          const rawId = net.network_id ?? net.id ?? net.networkId;
          const name = (net.network_name || net.name || net.network || "").toLowerCase();
          if (rawId === undefined || rawId === null) continue;
          if (name.includes("mtn")) map["mtn"] = rawId;
          else if (name.includes("glo")) map["glo"] = rawId;
          else if (name.includes("airtel")) map["airtel"] = rawId;
          else if (name.includes("9mobile") || name.includes("etisalat")) map["9mobile"] = rawId;
        }
        if (Object.keys(map).length > 0) {
          networkIdMap.current = map;
          console.log("Network ID map loaded:", map);
        }
      })
      .catch(() => console.log("Using static network ID map as fallback"));
  }, []);

  const getNetworkId = (networkName: string): number | string => {
    const key = networkName.toLowerCase().replace(/\s/g, "");
    // Try exact match first
    if (networkIdMap.current["mtn"] && key.includes("mtn")) return networkIdMap.current["mtn"];
    if (networkIdMap.current["glo"] && key.includes("glo")) return networkIdMap.current["glo"];
    if (networkIdMap.current["airtel"] && key.includes("airtel")) return networkIdMap.current["airtel"];
    if (networkIdMap.current["9mobile"] && (key.includes("9mobile") || key.includes("etisalat"))) return networkIdMap.current["9mobile"];
    // Fallback to static numeric mapping
    return getSMEPlugNetworkId(networkName);
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
      const result = await processPeyflexAirtime({
        network: selectedNetwork.name.toUpperCase(), // Peyflex expects network name like 'MTN', 'GLO', etc.
        amount: purchaseAmount,
        mobile_number: phoneNumber
      });

      if (result.status && result.status.toLowerCase() === 'failed') {
        throw new Error(result.message || "Transaction failed at Peyflex gateway");
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
        requestId: result.reference || result.id || `PEYFLEX-AIR-${Date.now()}`,
        createdAt: new Date().toISOString(),
        provider: "Peyflex"
      };
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);
      
      // 3. AI Notification
      await createAINotification(
        firestore, 
        user.uid, 
        `Successfully purchased ₦${purchaseAmount} ${selectedNetwork.name} airtime for ${phoneNumber} via Peyflex`,
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
