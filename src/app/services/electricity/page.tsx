
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Zap, Search, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
// import { processSMEPlugElectricity, verifySMEPlugMerchant } from "@/app/actions/smeplug";
import { processPeyflexElectricity, verifyPeyflexElectricityMeter } from "@/app/actions/peyflex";
import { createAINotification } from "@/services/notification-service";

const discoProviders = [
  { name: "Ikeja Electric (IKEDC)", vtuId: "ikeja-electric" },
  { name: "Eko Electric (EKEDC)", vtuId: "eko-electric" },
  { name: "Kano Electric (KEDCO)", vtuId: "kano-electric" },
  { name: "Port Harcourt Electric (PHED)", vtuId: "portharcourt-electric" },
  { name: "Jos Electric (JED)", vtuId: "jos-electric" },
  { name: "Ibadan Electric (IBEDC)", vtuId: "ibadan-electric" },
];

export default function ElectricityPurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedDisco, setSelectedDisco] = useState<typeof discoProviders[0] | null>(null);
  const [meterType, setMeterType] = useState("prepaid");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<any>(null);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  useEffect(() => {
    setVerificationData(null);
  }, [meterNumber, selectedDisco, meterType]);

  const handleVerify = async () => {
    if (!selectedDisco || !meterNumber) return;
    setIsVerifying(true);
    try {
      const result = await verifyPeyflexElectricityMeter(
        meterNumber,
        selectedDisco.vtuId,  // Use the Peyflex plan code (e.g., 'ikeja-electric')
        meterType as 'prepaid' | 'postpaid'
      );
      if (result.status === 'success' || result.status === true) {
        setVerificationData(result.content || result.data);
        toast({ title: "Meter Verified", description: `Found: ${(result.content || result.data).Customer_Name}` });
      } else {
        throw new Error(result.message || "Verification failed");
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedDisco || !verificationData) return;
    
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount < 500) {
      toast({ title: "Minimum ₦500", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < payAmount) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await processPeyflexElectricity({
        identifier: 'electricity',
        meter: meterNumber,
        plan: selectedDisco.vtuId,
        type: meterType as 'prepaid' | 'postpaid',
        amount: payAmount.toString(),
        phone: user.phoneNumber || '+234',
      });

      if (result.status !== 'success' && result.status !== true) {
        throw new Error(result.message || "Payment failed");
      }

      setPurchaseResult(result);
      await updateDoc(userRef, { balance: increment(-payAmount) });
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, {
        type: "electricity",
        amount: payAmount,
        service: selectedDisco.name,
        recipient: meterNumber,
        status: "success",
        requestId: result.reference || result.id || `SME-ELE-${Date.now()}`,
        createdAt: new Date().toISOString(),
        provider: "SMEPlug"
      });
      
      // AI Notification
      await createAINotification(
        firestore,
        user.uid,
        `Successful payment of NGN ${payAmount.toLocaleString()} for ${selectedDisco.name} (${meterNumber}) via SMEPlug`,
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
    const token = purchaseResult?.token || purchaseResult?.purchased_code || purchaseResult?.pin || purchaseResult?.token_id;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Payment Successful!</h1>
        {token && (
          <div className="bg-white p-6 rounded-2xl border-2 border-primary/20 shadow-inner mb-8">
            <p className="text-xs uppercase font-black text-muted-foreground mb-2">Your Token</p>
            <p className="text-3xl font-black tracking-widest">{token.replace("Token : ", "")}</p>
          </div>
        )}
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14" onClick={() => setIsSuccess(false)}>New Payment</Button>
          <Link href="/dashboard" className="block"><Button variant="outline" className="w-full rounded-2xl h-14">Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft size={24} /></Button></Link>
        <h1 className="text-xl font-black">Electricity</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto pb-24">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Select Provider</Label>
            <Select onValueChange={(val) => setSelectedDisco(discoProviders.find(d => d.vtuId === val) || null)}>
              <SelectTrigger className="h-16 rounded-2xl bg-white"><SelectValue placeholder="Choose DISCO" /></SelectTrigger>
              <SelectContent>{discoProviders.map((p) => <SelectItem key={p.vtuId} value={p.vtuId}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground">Meter Number</Label>
            <div className="relative">
              <Input
                placeholder="Enter meter number"
                className="h-16 rounded-2xl"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
              />
              <Button 
                size="sm" 
                className="absolute right-2 top-2 h-12 rounded-xl"
                onClick={handleVerify}
                disabled={isVerifying || !meterNumber || !selectedDisco}
              >
                {isVerifying ? <Loader2 className="animate-spin" /> : <Search size={16} />}
              </Button>
            </div>
          </div>

          {verificationData && (
            <Card className="bg-green-50 border-green-200 animate-in fade-in">
              <CardContent className="p-4 space-y-1">
                <p className="font-black text-sm uppercase text-green-800">{verificationData.Customer_Name}</p>
                <p className="text-xs text-green-600">{verificationData.Address}</p>
              </CardContent>
            </Card>
          )}

          {verificationData && (
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Amount (₦)</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                className="h-16 rounded-2xl font-black text-2xl"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </section>

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl" 
          onClick={handlePurchase}
          disabled={isProcessing || !verificationData || !amount}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : "Pay Now"}
        </Button>
      </main>
    </div>
  );
}
