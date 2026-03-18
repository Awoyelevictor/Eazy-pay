
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Zap } from "lucide-react";
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

const discoProviders = [
  "Ikeja Electric (IKEDC)",
  "Eko Electric (EKEDC)",
  "Abuja Electric (AEDC)",
  "Kano Electric (KEDCO)",
  "Port Harcourt Electric (PHED)",
  "Enugu Electric (EEDC)",
];

export default function ElectricityPurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [disco, setDisco] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
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
    
    if (!disco || !meterNumber || !amount) {
      toast({
        title: "Incomplete Details",
        description: "Please provide all required fields.",
        variant: "destructive",
      });
      return;
    }

    const payAmount = parseFloat(amount);
    if (profile && profile.balance < payAmount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    const transactionData = {
      type: "electricity",
      amount: payAmount,
      service: `${disco} (${meterType})`,
      recipient: meterNumber,
      status: "success",
      createdAt: new Date().toISOString(),
    };

    updateDoc(userRef, {
      balance: increment(-payAmount)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { balance: increment(-payAmount) }
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
        <h1 className="text-3xl font-black mb-3">Token Generated!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto">
          Your electricity token for meter <span className="font-bold text-foreground">{meterNumber}</span> has been sent via SMS.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => setIsSuccess(false)}>
            Buy Again
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
        <h1 className="text-xl font-black">Electricity Bill</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Select DISCO</Label>
            <Select onValueChange={setDisco}>
              <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                <SelectValue placeholder="Choose provider" />
              </SelectTrigger>
              <SelectContent>
                {discoProviders.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Meter Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {["prepaid", "postpaid"].map((type) => (
                <button
                  key={type}
                  onClick={() => setMeterType(type)}
                  className={`h-14 rounded-2xl border transition-all font-bold capitalize ${
                    meterType === type ? "bg-primary/10 border-primary text-primary" : "bg-white border-secondary"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Meter Number</Label>
            <Input
              placeholder="Enter 11-digit meter number"
              className="h-14 rounded-2xl border-secondary bg-white font-bold"
              value={meterNumber}
              onChange={(e) => setMeterNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">Amount (₦)</Label>
            <Input
              type="number"
              placeholder="e.g. 5000"
              className="h-14 rounded-2xl border-secondary bg-white font-bold"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
          {isProcessing ? <Loader2 className="animate-spin" /> : "Pay Bill"}
        </Button>
      </main>
    </div>
  );
}
