
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Zap, Search, User, MapPin, Receipt, Copy } from "lucide-react";
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
  { name: "Kano Electric (KEDCO)", vtuId: "kano-electric" },
  { name: "Port Harcourt Electric (PHED)", vtuId: "portharcourt-electric" },
  { name: "Jos Electric (JED)", vtuId: "jos-electric" },
  { name: "Ibadan Electric (IBEDC)", vtuId: "ibadan-electric" },
  { name: "Abuja Electric (AEDC)", vtuId: "abuja-electric" },
  { name: "Enugu Electric (EEDC)", vtuId: "enugu-electric" },
  { name: "Benin Electric (BEDC)", vtuId: "benin-electric" },
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

  // Reset verification when inputs change
  useEffect(() => {
    setVerificationData(null);
  }, [meterNumber, selectedDisco, meterType]);

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

  const handleVerify = async () => {
    if (!selectedDisco || !meterNumber) {
      toast({ title: "Details Required", description: "Select a provider and enter meter number.", variant: "destructive" });
      return;
    }

    setIsVerifying(true);
    try {
      const response = await fetch(`https://vtpass.com/api/merchant-verify`, {
        method: 'POST',
        headers: {
          'api-key': VTU_CONFIG.API_KEY,
          'public-key': VTU_CONFIG.PUBLIC_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          billersCode: meterNumber,
          serviceID: selectedDisco.vtuId,
          type: meterType
        })
      });

      const result = await response.json();
      if (result.code === '000') {
        setVerificationData(result.content);
        toast({ title: "Meter Verified", description: `Found: ${result.content.Customer_Name || result.content.Customer_Name || "Customer"}` });
      } else {
        throw new Error(result.response_description || "Could not verify meter number");
      }
    } catch (error: any) {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedDisco || !verificationData) return;
    
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount < 500) {
      toast({ title: "Invalid Amount", description: "Minimum purchase is ₦500.", variant: "destructive" });
      return;
    }

    if (profile && profile.balance < payAmount) {
      toast({ title: "Insufficient Balance", description: "Please fund your wallet.", variant: "destructive" });
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

      setPurchaseResult(result);

      const transactionData = {
        type: "electricity",
        amount: payAmount,
        service: `${selectedDisco.name} (${meterType})`,
        recipient: meterNumber,
        status: "success",
        requestId: requestId,
        token: result.token || result.purchased_code || null,
        createdAt: new Date().toISOString(),
      };

      // 1. Deduct balance
      updateDoc(userRef, {
        balance: increment(-payAmount)
      }).catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: userRef.path,
          operation: 'update',
          requestResourceData: { balance: increment(-payAmount) }
        }));
      });

      // 2. Add record
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

  const copyToken = () => {
    const token = purchaseResult?.token || purchaseResult?.purchased_code;
    if (token) {
      navigator.clipboard.writeText(token.replace("Token : ", ""));
      toast({ title: "Copied!", description: "Token copied to clipboard." });
    }
  };

  if (isSuccess) {
    const token = purchaseResult?.token || purchaseResult?.purchased_code;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Payment Successful!</h1>
        <p className="text-muted-foreground mb-8 max-w-xs mx-auto">
          ₦{parseFloat(amount).toLocaleString()} for Meter <span className="font-bold text-foreground">{meterNumber}</span>.
        </p>

        {meterType === "prepaid" && token && (
          <Card className="w-full max-w-sm border-2 border-primary/20 bg-primary/5 rounded-3xl mb-8 overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                <Receipt size={16} /> Your Meter Token
              </div>
              <div className="bg-white rounded-2xl p-6 border shadow-inner">
                <p className="text-3xl font-black tracking-[0.2em] text-foreground mb-2">{token.replace("Token : ", "")}</p>
                <Button variant="ghost" size="sm" className="text-[10px] font-bold gap-2 text-muted-foreground" onClick={copyToken}>
                  <Copy size={12} /> Click to Copy
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">Input this code into your meter to load credits.</p>
            </CardContent>
          </Card>
        )}

        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => {
            setIsSuccess(false);
            setAmount("");
            setMeterNumber("");
            setVerificationData(null);
          }}>
            New Payment
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
        <h1 className="text-xl font-black">Electricity Bill</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto pb-24">
        <section className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Select Provider</Label>
            <Select onValueChange={(val) => setSelectedDisco(discoProviders.find(d => d.vtuId === val) || null)}>
              <SelectTrigger className="h-16 rounded-2xl border-secondary bg-white text-base font-bold shadow-sm">
                <SelectValue placeholder="Choose DISCO" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {discoProviders.map((p) => (
                  <SelectItem key={p.vtuId} value={p.vtuId} className="h-12 font-medium">{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Meter Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {["prepaid", "postpaid"].map((type) => (
                <button
                  key={type}
                  onClick={() => setMeterType(type)}
                  className={`h-14 rounded-2xl border-2 transition-all font-black capitalize text-sm ${
                    meterType === type ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-white border-secondary text-muted-foreground"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Meter Number</Label>
            <div className="relative">
              <Input
                placeholder="Enter 11-13 digit number"
                className="h-16 rounded-2xl border-secondary bg-white font-black text-lg px-6 shadow-sm"
                value={meterNumber}
                onChange={(e) => setMeterNumber(e.target.value)}
              />
              {!verificationData && (
                <Button 
                  size="sm" 
                  className="absolute right-2 top-2 h-12 rounded-xl px-4 font-black"
                  onClick={handleVerify}
                  disabled={isVerifying || !meterNumber || !selectedDisco}
                >
                  {isVerifying ? <Loader2 className="animate-spin h-4 w-4" /> : <><Search size={16} className="mr-2" /> Verify</>}
                </Button>
              )}
            </div>
          </div>

          {verificationData && (
            <Card className="bg-green-50/50 border-green-200 rounded-[2rem] animate-in fade-in slide-in-from-top-4">
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-3 text-green-700">
                  <User size={18} />
                  <span className="font-black text-sm uppercase">{verificationData.Customer_Name || verificationData.name || "Customer Verified"}</span>
                </div>
                {verificationData.Address && (
                  <div className="flex gap-3 text-muted-foreground text-xs font-medium">
                    <MapPin size={16} className="shrink-0" />
                    <span>{verificationData.Address}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {verificationData && (
            <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
              <Label className="text-xs font-black uppercase text-muted-foreground tracking-widest">Purchase Amount (₦)</Label>
              <div className="relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-xl text-muted-foreground">₦</span>
                <Input
                  type="number"
                  placeholder="e.g. 5000"
                  className="h-16 rounded-2xl border-secondary bg-white font-black text-2xl pl-12 shadow-sm"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
          )}
        </section>

        <Card className="bg-primary/5 border-none rounded-[2rem]">
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
          disabled={isProcessing || !verificationData || !amount}
        >
          {isProcessing ? (
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin" /> Vending Token...
            </div>
          ) : `Pay ${amount ? '₦' + parseFloat(amount).toLocaleString() : 'Now'}`}
        </Button>
      </main>
    </div>
  );
}
