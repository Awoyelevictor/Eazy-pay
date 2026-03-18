
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const providers = [
  { name: "DStv", bundles: ["Compact - ₦12,500", "Confam - ₦7,400", "Premium - ₦29,500"] },
  { name: "GOtv", bundles: ["Jolli - ₦4,850", "Max - ₦7,200", "Supa - ₦9,600"] },
  { name: "StarTimes", bundles: ["Nova - ₦1,500", "Smart - ₦3,500", "Super - ₦6,500"] },
];

export default function CablePurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedProvider, setSelectedProvider] = useState<typeof providers[0] | null>(null);
  const [smartCardNumber, setSmartCardNumber] = useState("");
  const [bundle, setBundle] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  const price = useMemo(() => {
    if (!bundle) return 0;
    const match = bundle.match(/₦([\d,]+)/);
    return match ? parseFloat(match[1].replace(/,/g, "")) : 0;
  }, [bundle]);

  const handlePurchase = () => {
    if (!user || !firestore || !userRef) return;
    
    if (!selectedProvider || !smartCardNumber || !bundle) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < price) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const transactionData = {
      type: "cable",
      amount: price,
      service: `${selectedProvider.name} - ${bundle.split(" - ")[0]}`,
      recipient: smartCardNumber,
      status: "success",
      createdAt: new Date().toISOString(),
    };

    updateDoc(userRef, {
      balance: increment(-price)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { balance: increment(-price) }
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
        <h1 className="text-3xl font-black mb-3">Subscription Active!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto">
          Your cable TV service for <span className="font-bold text-foreground">{smartCardNumber}</span> has been renewed.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => setIsSuccess(false)}>
            Back
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full rounded-2xl h-14 text-lg font-bold border-secondary">
              Dashboard
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
        <h1 className="text-xl font-black">Cable TV</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Select Provider</Label>
            <div className="grid grid-cols-3 gap-3">
              {providers.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setSelectedProvider(p); setBundle(""); }}
                  className={`h-14 rounded-2xl border transition-all font-bold ${
                    selectedProvider?.name === p.name ? "bg-primary/10 border-primary text-primary" : "bg-white border-secondary"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {selectedProvider && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Select Bundle</Label>
              <Select onValueChange={setBundle} value={bundle}>
                <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                  <SelectValue placeholder="Choose package" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProvider.bundles.map((b) => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">SmartCard / IUC Number</Label>
            <Input
              placeholder="e.g. 1023948576"
              className="h-14 rounded-2xl border-secondary bg-white font-bold"
              value={smartCardNumber}
              onChange={(e) => setSmartCardNumber(e.target.value)}
            />
          </div>
        </div>

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
          {isProcessing ? <Loader2 className="animate-spin" /> : "Subscribe Now"}
        </Button>
      </main>
    </div>
  );
}
