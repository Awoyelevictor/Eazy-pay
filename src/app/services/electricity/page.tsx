
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
import { VTU_CONFIG } from "@/firebase/config";

const discoProviders = [
  { name: "Ikeja Electric (IKEDC)", vtuId: "ikeja-electric" },
  { name: "Eko Electric (EKEDC)", vtuId: "eko-electric" },
  { name: "Abuja Electric (AEDC)", vtuId: "abuja-electric" },
  { name: "Kano Electric (KEDCO)", vtuId: "kano-electric" },
  { name: "Port Harcourt Electric (PHED)", vtuId: "portharcourt-electric" },
];

export default function ElectricityPurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedDisco, setSelectedDisco] = useState<typeof discoProviders[0] | null>(null);
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
    if (!user || !firestore || !userRef || !selectedDisco) return;
    
    if (!meterNumber || !amount) {
      toast({ title: "Incomplete Details", variant: "destructive" });
      return;
    }

    const payAmount = parseFloat(amount);
    if (profile && profile.balance < payAmount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
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
          serviceID: selectedDisco.vtuId,
          billersCode: meterNumber,
          variation_code: meterType,
          amount: payAmount,
          phone: user.phoneNumber || "08000000000"
        })
      });

      const result = await response.json();

      if (result.code !== '000') {
        throw new Error(result.response_description || "Payment Failed");
      }

      const transactionData = {
        type: "electricity",
        amount: payAmount,
        service: `${selectedDisco.name} (${meterType})`,
        recipient: meterNumber,
        status: "success",
        requestId: requestId,
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
      await addDoc(transactionsRef, transactionData);
      
      setIsSuccess(true);
    } catch (error: any) {
      toast({
        title: "Bill Payment Failed",
        description: error.message || "Failed to process electricity token.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Token Generated!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto">
          Your electricity token for meter <span className="font-bold text-foreground">{meterNumber}</span> has been sent.
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
            <Select onValueChange={(val) => setSelectedDisco(discoProviders.find(d => d.vtuId === val) || null)}>
              <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                <SelectValue placeholder="Choose provider" />
              </SelectTrigger>
              <SelectContent>
                {discoProviders.map((p) => (
                  <SelectItem key={p.vtuId} value={p.vtuId}>{p.name}</SelectItem>
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
