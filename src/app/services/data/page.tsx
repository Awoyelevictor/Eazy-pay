
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Wifi } from "lucide-react";
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

const bundles = [
  { id: "1", label: "1GB / 30 Days", price: 350 },
  { id: "2", label: "2GB / 30 Days", price: 650 },
  { id: "3", label: "5GB / 30 Days", price: 1500 },
  { id: "4", label: "10GB / 30 Days", price: 2800 },
  { id: "5", label: "20GB / 30 Days", price: 5000 },
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
    
    if (!selectedNetwork || !phoneNumber || !selectedBundle) {
      toast({
        title: "Incomplete Details",
        description: "Please select network, bundle and enter phone number.",
        variant: "destructive",
      });
      return;
    }

    if (profile && profile.balance < selectedBundle.price) {
      toast({
        title: "Insufficient Balance",
        description: "Please fund your wallet.",
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

    updateDoc(userRef, {
      balance: increment(-selectedBundle.price)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { balance: increment(-selectedBundle.price) }
      }));
    });

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
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Data Active!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto">
          {selectedBundle?.label} has been credited to <span className="font-bold text-foreground">{phoneNumber}</span>.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => {
            setIsSuccess(false);
            setSelectedBundle(null);
            setPhoneNumber("");
          }}>
            Buy More
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
        <h1 className="text-xl font-black">Buy Data</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-xl mx-auto">
        <section>
          <Label className="text-sm font-bold mb-4 block text-muted-foreground uppercase tracking-wider">Select Network</Label>
          <div className="grid grid-cols-4 gap-4">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => setSelectedNetwork(net.name)}
                className={`flex flex-col items-center gap-3 p-3 rounded-3xl transition-all ${
                  selectedNetwork === net.name ? "bg-primary/10 ring-2 ring-primary shadow-lg" : "bg-white border border-secondary shadow-sm"
                }`}
              >
                <div className={`h-12 w-12 rounded-2xl ${net.color} flex items-center justify-center text-white font-black text-xl`}>
                  {net.logo}
                </div>
                <span className="text-[10px] font-bold">{net.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Recipient Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="080 0000 0000"
              className="h-16 rounded-2xl bg-white border-secondary/80 text-lg font-bold px-6 shadow-sm"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Select Bundle</Label>
            <div className="grid grid-cols-1 gap-3">
              {bundles.map((bundle) => (
                <button
                  key={bundle.id}
                  onClick={() => setSelectedBundle(bundle)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    selectedBundle?.id === bundle.id ? "border-primary bg-primary/5 shadow-md" : "border-secondary bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Wifi size={20} className={selectedBundle?.id === bundle.id ? "text-primary" : "text-muted-foreground"} />
                    <span className="font-bold text-sm">{bundle.label}</span>
                  </div>
                  <span className="font-black text-primary">₦{bundle.price}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <Card className="bg-primary/5 border-none rounded-[2rem]">
          <CardContent className="p-6 flex gap-4 text-primary">
            <Info size={24} className="flex-shrink-0 mt-0.5" />
            <div className="text-sm font-medium">
              <p>Wallet Balance: <span className="font-black">₦{profile?.balance?.toLocaleString() || "0.00"}</span></p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl transition-all hover:scale-[1.02]" 
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin mr-2" /> : "Purchase Data"}
        </Button>
      </main>
    </div>
  );
}
