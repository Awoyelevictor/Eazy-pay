
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Gamepad2 } from "lucide-react";
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

const gameProviders = [
  { 
    name: "Call of Duty Mobile", 
    bundles: [
      { id: "cod1", label: "80 CP", price: 500 },
      { id: "cod2", label: "420 CP", price: 2500 },
      { id: "cod3", label: "880 CP", price: 5000 }
    ] 
  },
  { 
    name: "Free Fire", 
    bundles: [
      { id: "ff1", label: "100 Diamonds", price: 600 },
      { id: "ff2", label: "310 Diamonds", price: 1800 },
      { id: "ff3", label: "520 Diamonds", price: 3000 }
    ] 
  },
  { 
    name: "Bloodstrike", 
    bundles: [
      { id: "bs1", label: "100 Gold", price: 400 },
      { id: "bs2", label: "500 Gold", price: 1800 },
      { id: "bs3", label: "1000 Gold", price: 3500 }
    ] 
  },
];

export default function GameTopupPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedGame, setSelectedGame] = useState<typeof gameProviders[0] | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  const selectedBundle = useMemo(() => {
    if (!selectedGame || !selectedBundleId) return null;
    return selectedGame.bundles.find(b => b.id === selectedBundleId);
  }, [selectedGame, selectedBundleId]);

  const handlePurchase = () => {
    if (!user || !firestore || !userRef) return;
    
    if (!selectedGame || !playerId || !selectedBundle) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < selectedBundle.price) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const transactionData = {
      type: "games",
      amount: selectedBundle.price,
      network: selectedGame.name,
      service: selectedBundle.label,
      recipient: playerId,
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
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Top-up Successful!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto">
          {selectedBundle?.label} has been credited to Player ID <span className="font-bold text-foreground">{playerId}</span>.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => {
            setIsSuccess(false);
            setPlayerId("");
            setSelectedBundleId("");
          }}>
            New Top-up
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
        <h1 className="text-xl font-black">Game Top-up</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Select Game</Label>
            <div className="grid grid-cols-1 gap-3">
              {gameProviders.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { setSelectedGame(p); setSelectedBundleId(""); }}
                  className={`h-16 rounded-2xl border px-4 transition-all font-bold flex items-center justify-between ${
                    selectedGame?.name === p.name ? "bg-primary/10 border-primary text-primary" : "bg-white border-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center">
                      <Gamepad2 size={20} className={selectedGame?.name === p.name ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    {p.name}
                  </div>
                  {selectedGame?.name === p.name && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
          </div>

          {selectedGame && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Select Bundle</Label>
              <Select onValueChange={setSelectedBundleId} value={selectedBundleId}>
                <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                  <SelectValue placeholder="Choose credits package" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGame.bundles.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.label} - ₦{b.price.toLocaleString()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Player ID / UID</Label>
            <Input
              placeholder="Enter your game ID"
              className="h-14 rounded-2xl border-secondary bg-white font-bold"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground px-1 italic">Please ensure your Player ID is correct. Transactions are non-refundable.</p>
          </div>
        </div>

        <Card className="bg-primary/5 border-none rounded-[2rem]">
          <CardContent className="p-6 flex gap-4 text-primary">
            <Info size={24} className="flex-shrink-0" />
            <div className="text-sm font-medium">
              <p>Wallet Balance: <span className="font-black">₦{profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</span></p>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/20" 
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : `Pay ₦${selectedBundle?.price.toLocaleString() || "0"}`}
        </Button>
      </main>
    </div>
  );
}
