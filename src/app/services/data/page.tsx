
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
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { VTU_CONFIG } from "@/firebase/config";

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M", textColor: "text-black", vtuId: "mtn-data" },
  { name: "Glo", color: "bg-green-600", logo: "G", textColor: "text-white", vtuId: "glo-data" },
  { name: "Airtel", color: "bg-red-600", logo: "A", textColor: "text-white", vtuId: "airtel-data" },
  { name: "9mobile", color: "bg-emerald-900", logo: "9", textColor: "text-white", vtuId: "etisalat-data" },
];

const networkBundles: Record<string, Array<{ id: string, label: string, price: number, variation: string }>> = {
  "MTN": [
    { id: "m1", variation: "mtn-100mb-1000", label: "1.5GB / 30 Days", price: 1000 },
    { id: "m2", variation: "mtn-500mb-2000", label: "4.5GB / 30 Days", price: 2000 },
    { id: "m3", variation: "mtn-3gb-2500", label: "6GB / 30 Days", price: 2500 },
    { id: "m4", variation: "mtn-data-3000", label: "8GB / 30 Days", price: 3000 },
    { id: "m5", variation: "mtn-1gb-3500", label: "10GB / 30 Days", price: 3500 },
    { id: "m6", variation: "mtn-100hr-5000", label: "15GB / 30 Days", price: 5000 },
  ],
  "Airtel": [
    { id: "a1", variation: "airt-1000", label: "1.5GB / 30 Days", price: 1000 },
    { id: "a2", variation: "airt-2000", label: "4.5GB / 30 Days", price: 2000 },
    { id: "a3", variation: "airt-3000", label: "8GB / 30 Days", price: 3000 },
    { id: "a4", variation: "airt-5000", label: "15GB / 30 Days", price: 5000 },
    { id: "a5", variation: "airt-10000", label: "40GB / 30 Days", price: 10000 },
  ],
  "Glo": [
    { id: "g1", variation: "glo1000", label: "2.5GB / 30 Days", price: 1000 },
    { id: "g2", variation: "glo2000", label: "5.8GB / 30 Days", price: 2000 },
    { id: "g3", variation: "glo2500", label: "7.7GB / 30 Days", price: 2500 },
    { id: "g4", variation: "glo3000", label: "10GB / 30 Days", price: 3000 },
    { id: "g5", variation: "glo5000", label: "18.25GB / 30 Days", price: 5000 },
  ],
  "9mobile": [
    { id: "e1", variation: "eti-1000", label: "1.5GB / 30 Days", price: 1000 },
    { id: "e2", variation: "eti-2000", label: "4.5GB / 30 Days", price: 2000 },
    { id: "e3", variation: "eti-5000", label: "15GB / 30 Days", price: 5000 },
    { id: "e4", variation: "eti-10000", label: "40GB / 30 Days", price: 10000 },
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
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hour = now.getHours().toString().padStart(2, "0");
    const minute = now.getMinutes().toString().padStart(2, "0");
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${year}${month}${day}${hour}${minute}${randomPart}`;
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef) return;
    
    if (!selectedNetwork || !phoneNumber || !selectedBundle) {
      toast({ title: "Incomplete Details", description: "Select network, bundle and enter phone number.", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < selectedBundle.price) {
      toast({ title: "Insufficient Balance", description: "Please fund your wallet first.", variant: "destructive" });
      return;
    }

    if (VTU_CONFIG.PUBLIC_KEY.includes("REPLACE_WITH")) {
      toast({ title: "Live Mode Inactive", description: "Public Key is required for delivery.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = generateRequestId();
      
      const response = await fetch(`${VTU_CONFIG.BASE_URL}/pay`, {
        method: 'POST',
        headers: {
          'api-key': VTU_CONFIG.API_KEY,
          'public-key': VTU_CONFIG.PUBLIC_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          request_id: requestId,
          serviceID: selectedNetwork.vtuId,
          billersCode: phoneNumber,
          variation_code: selectedBundle.variation,
          amount: selectedBundle.price,
          phone: user.phoneNumber || phoneNumber
        })
      });

      const result = await response.json();

      if (result.code !== '000') {
        throw new Error(result.response_description || "Transaction failed at network gateway");
      }

      const transactionData = {
        type: "data",
        amount: selectedBundle.price,
        network: selectedNetwork.name,
        recipient: phoneNumber,
        service: selectedBundle.label,
        status: "success",
        requestId: requestId,
        vtpassId: result.content?.transactions?.transactionId || "N/A",
        createdAt: new Date().toISOString(),
      };

      // 1. Deduct balance
      updateDoc(userRef, {
        balance: increment(-selectedBundle.price)
      }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { balance: increment(-selectedBundle.price) }
        }));
      });

      // 2. Add transaction record
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);
      
      setIsSuccess(true);
    } catch (error: any) {
      toast({
        title: "Network Delivery Failed",
        description: error.message || "Network error. Try again later.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-28 w-28 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={64} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Data Sent Successfully!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto text-lg">
           {selectedBundle?.label} has been credited to {phoneNumber}.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-16 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => {
            setIsSuccess(false);
            setPhoneNumber("");
            setSelectedBundle(null);
          }}>
            New Purchase
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full rounded-2xl h-16 text-lg font-bold border-secondary">
              Back to Dashboard
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
        <h1 className="text-xl font-black">Buy Data Bundles</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-xl mx-auto pb-24">
        <section>
          <Label className="text-xs font-black mb-4 block text-muted-foreground uppercase tracking-widest">1. Choose Network</Label>
          <div className="grid grid-cols-4 gap-3">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => {
                  setSelectedNetwork(net);
                  setSelectedBundle(null);
                }}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border-2 ${
                  selectedNetwork?.name === net.name 
                    ? "bg-primary/5 border-primary shadow-md scale-105" 
                    : "bg-white border-transparent shadow-sm grayscale opacity-70"
                }`}
              >
                <div className={`h-12 w-12 rounded-xl ${net.color} flex items-center justify-center ${net.textColor} font-black text-xl shadow-sm`}>
                  {net.logo}
                </div>
                <span className="text-[10px] font-bold">{net.name}</span>
              </button>
            ))}
          </div>
        </section>

        {selectedNetwork && (
          <section className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-xs font-black text-muted-foreground uppercase tracking-widest">2. Destination Number</Label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="080 0000 0000"
                  className="h-16 rounded-2xl bg-white border-secondary text-lg font-bold pl-12 shadow-sm"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest">3. Select a Bundle</Label>
              <div className="grid grid-cols-1 gap-3">
                {availableBundles.map((bundle) => (
                  <button
                    key={bundle.id}
                    onClick={() => setSelectedBundle(bundle)}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                      selectedBundle?.id === bundle.id 
                        ? "border-primary bg-primary/5 shadow-inner" 
                        : "border-secondary bg-white hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${selectedBundle?.id === bundle.id ? "bg-primary text-white" : "bg-secondary text-primary"}`}>
                         <Wifi size={18} />
                      </div>
                      <span className="font-bold text-sm">{bundle.label}</span>
                    </div>
                    <span className="font-black text-lg text-primary">₦{bundle.price.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <Card className="bg-primary/5 border-none rounded-[2rem] shadow-none">
          <CardContent className="p-6 flex gap-4 text-primary items-center">
            <Info size={24} className="flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Wallet Balance: <span className="font-black text-lg">₦{profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</span></p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" 
          onClick={handlePurchase}
          disabled={isProcessing || !selectedBundle}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : `Subscribe Now (₦${selectedBundle?.price.toLocaleString() || "0"})`}
        </Button>
      </main>
    </div>
  );
}
