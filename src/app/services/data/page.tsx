
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

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M", textColor: "text-black" },
  { name: "Glo", color: "bg-green-600", logo: "G", textColor: "text-white" },
  { name: "Airtel", color: "bg-red-600", logo: "A", textColor: "text-white" },
  { name: "9mobile", color: "bg-emerald-900", logo: "9", textColor: "text-white" },
];

const bundles = [
  { id: "1", label: "1GB / 30 Days", price: 300, value: "1GB" },
  { id: "2", label: "2GB / 30 Days", price: 600, value: "2GB" },
  { id: "3", label: "5GB / 30 Days", price: 1500, value: "5GB" },
  { id: "4", label: "10GB / 30 Days", price: 2900, value: "10GB" },
  { id: "5", label: "20GB / 30 Days", price: 5500, value: "20GB" },
  { id: "6", label: "40GB / 30 Days", price: 10000, value: "40GB" },
];

export default function DataPurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedBundle, setSelectedBundle] = useState<typeof bundles[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  const handlePurchase = () => {
    if (!user || !firestore || !userRef) return;
    
    if (!selectedNetwork) {
      toast({ title: "Select Network", description: "Please choose a network provider.", variant: "destructive" });
      return;
    }
    if (!phoneNumber || phoneNumber.length < 11) {
      toast({ title: "Invalid Number", description: "Please enter a valid 11-digit phone number.", variant: "destructive" });
      return;
    }
    if (!selectedBundle) {
      toast({ title: "Select Bundle", description: "Please choose a data plan.", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < selectedBundle.price) {
      toast({
        title: "Insufficient Balance",
        description: `You need ₦${(selectedBundle.price - profile.balance).toLocaleString()} more to buy this bundle.`,
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const transactionData = {
      type: "data",
      amount: selectedBundle.price,
      network: selectedNetwork,
      recipient: phoneNumber,
      service: selectedBundle.label,
      status: "success",
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

    // 2. Add transaction
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
          requestResourceData: transactionData
        }));
      });
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-28 w-28 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={64} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Data Active!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto text-lg">
          <span className="font-bold text-foreground">{selectedBundle?.value}</span> has been sent to <span className="font-bold text-foreground">{phoneNumber}</span> via {selectedNetwork}.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-16 text-lg font-bold shadow-xl shadow-primary/20" onClick={() => {
            setIsSuccess(false);
            setSelectedBundle(null);
            setPhoneNumber("");
          }}>
            Buy Another Bundle
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
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-lg z-10 border-b">
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
                onClick={() => setSelectedNetwork(net.name)}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition-all border-2 ${
                  selectedNetwork === net.name 
                    ? "bg-primary/5 border-primary shadow-md scale-105" 
                    : "bg-white border-transparent shadow-sm grayscale opacity-70 hover:grayscale-0 hover:opacity-100"
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

        <section className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-xs font-black text-muted-foreground uppercase tracking-widest">2. Destination Number</Label>
            <div className="relative">
              <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
              <Input
                id="phone"
                type="tel"
                placeholder="080 0000 0000"
                className="h-16 rounded-2xl bg-white border-secondary text-lg font-bold pl-12 pr-6 shadow-sm focus:ring-primary"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-black text-muted-foreground uppercase tracking-widest">3. Select a Plan</Label>
            <div className="grid grid-cols-1 gap-3">
              {bundles.map((bundle) => (
                <button
                  key={bundle.id}
                  onClick={() => setSelectedBundle(bundle)}
                  className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                    selectedBundle?.id === bundle.id 
                      ? "border-primary bg-primary/5 shadow-inner" 
                      : "border-secondary bg-white hover:border-primary/20"
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
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" /> Provisioning...
            </div>
          ) : `Pay ₦${selectedBundle?.price.toLocaleString() || "0"}`}
        </Button>
      </main>
    </div>
  );
}
