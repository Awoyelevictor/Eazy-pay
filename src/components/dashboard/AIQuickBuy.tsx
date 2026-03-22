
"use client";

import { useState, useMemo } from "react";
import { Sparkles, Send, Loader2, Check, X } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { quickPurchaseAssistant, type QuickPurchaseAssistantOutput } from "@/ai/flows/quick-purchase-assistant";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { processSMEPlugAirtime, processSMEPlugData, getSMEPlugNetworkId } from "@/app/actions/smeplug";

// Price mapping for AI consistency
const PRICE_MAP: Record<string, number> = {
  '1GB': 1000,
  '2GB': 2000,
  '5GB': 3000,
  '10GB': 5000,
  '20GB': 10000,
};

// Common SMEPlug Data Plan IDs (Standard MTN SME IDs - these vary, so we suggest manual for better accuracy)
const SMEPLUG_DATA_PLANS: Record<string, number> = {
  'mtn-1000': 11, // Example ID for MTN 1.5GB
  'glo-1000': 21,
  'airtel-1000': 31,
  '9mobile-1000': 41,
};

export function AIQuickBuy() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [parsedResult, setParsedResult] = useState<QuickPurchaseAssistantOutput | null>(null);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  const handleAssistantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const result = await quickPurchaseAssistant({ naturalLanguagePrompt: prompt });
      setParsedResult(result);
      setPrompt("");
    } catch (error) {
      toast({
        title: "AI error",
        description: "I couldn't understand that request. Try something like 'N1000 MTN data'.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePurchase = async () => {
    if (!user || !firestore || !userRef || !parsedResult || !profile) return;

    // Determine Cost and standard Label
    let cost = parsedResult.amount;
    let serviceLabel = parsedResult.serviceType === 'airtime' ? 'Airtime' : `${parsedResult.amount}GB Data`;

    if (parsedResult.serviceType === 'data') {
      const key = `${parsedResult.amount}GB`;
      cost = PRICE_MAP[key] || (parsedResult.amount >= 1000 ? parsedResult.amount : 1000);
    }
    
    if (profile.balance < cost) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ₦${cost.toLocaleString()} for this transaction.`,
        variant: "destructive",
      });
      setParsedResult(null);
      return;
    }

    const networkName = parsedResult.networkProvider !== 'unknown' ? parsedResult.networkProvider.toUpperCase() : "MTN";
    const recipientPhone = parsedResult.phoneNumber || user.phoneNumber;

    if (!recipientPhone) {
      toast({ title: "Phone Required", description: "Please include a phone number in your prompt next time.", variant: "destructive" });
      setParsedResult(null);
      return;
    }

    setIsExecuting(true);

    try {
      let result;

      if (parsedResult.serviceType === 'airtime') {
        result = await processSMEPlugAirtime({
          network_id: getSMEPlugNetworkId(networkName),
          amount: cost,
          phone_number: recipientPhone
        });
      } else {
        const planId = SMEPLUG_DATA_PLANS[`${networkName.toLowerCase()}-${cost}`];
        if (!planId) {
          throw new Error(`That specific data plan via AI box requires manual selection on the Data page for 100% accuracy.`);
        }
        result = await processSMEPlugData({
          network_id: getSMEPlugNetworkId(networkName),
          plan_id: planId,
          phone_number: recipientPhone,
          customer_reference: `SME-AI-${Date.now()}`
        });
      }

      if (!result.status || result.status === 'fail' || result.status === 'failed') {
        throw new Error(result.message || "SMEPlug gateway rejected the purchase.");
      }

      // 1. Deduct wallet
      await updateDoc(userRef, { balance: increment(-cost) });

      // 2. Log real transaction
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, {
        type: parsedResult.serviceType,
        amount: cost,
        network: networkName,
        recipient: recipientPhone,
        service: serviceLabel,
        status: "success",
        requestId: result.reference || result.id || `SME-AI-${Date.now()}`,
        createdAt: new Date().toISOString(),
        aiGenerated: true,
        provider: "SMEPlug"
      });

      toast({
        title: "AI Purchase Activated! ⚡",
        description: `Successfully executed: ${networkName} ${serviceLabel} to ${recipientPhone} via SMEPlug`,
      });
      
      setParsedResult(null);

    } catch (error: any) {
      console.error("AI Purchase Error:", error);
      toast({ title: "Execution Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExecuting(false);
    }
  };

  if (parsedResult) {
    return (
      <Card className="border-primary bg-primary/5 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-[2.5rem] ring-4 ring-primary/10">
        <CardContent className="p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="h-14 w-14 bg-primary rounded-[1.25rem] flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Sparkles size={28} className="fill-white" />
            </div>
            <div>
              <p className="text-xs font-black text-primary uppercase tracking-widest">AI Intelligence</p>
              <h3 className="text-xl font-bold text-foreground">Confirm Request</h3>
            </div>
          </div>
          
          <div className="bg-white/60 backdrop-blur-sm p-5 rounded-2xl mb-8 border border-primary/10">
            <p className="text-base text-foreground font-medium leading-relaxed italic">
              "{parsedResult.confirmationMessage}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button 
              className="rounded-2xl h-16 font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95"
              onClick={handleExecutePurchase}
              disabled={isExecuting}
            >
              {isExecuting ? <Loader2 className="animate-spin" /> : <Check className="mr-2" size={24} />}
              Confirm
            </Button>
            <Button 
              variant="outline" 
              className="rounded-2xl h-16 font-black text-lg border-2 border-secondary hover:bg-secondary/50 active:scale-95"
              onClick={() => setParsedResult(null)}
              disabled={isExecuting}
            >
              <X className="mr-2" size={24} />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent/30 bg-secondary/20 shadow-inner rounded-[2.5rem] border-2">
      <CardHeader className="pb-3 px-8 pt-6">
        <CardTitle className="text-xs font-black flex items-center gap-2 text-primary uppercase tracking-widest">
          <Sparkles className="h-4 w-4 fill-primary animate-pulse" />
          Fyre AI Instant Purchase
        </CardTitle>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form onSubmit={handleAssistantSubmit} className="relative group">
          <Input
            placeholder="N1000 MTN data for 080123..."
            className="h-16 pr-14 bg-background border-2 border-transparent focus:border-primary rounded-2xl shadow-sm text-lg font-medium transition-all"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute right-2 top-2 h-12 w-12 text-primary hover:text-white hover:bg-primary rounded-xl transition-all"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-wider self-center mr-1">Suggestions:</span>
          <button 
            type="button" 
            onClick={() => setPrompt("N500 Glo airtime")}
            className="text-[10px] font-bold bg-white px-3 py-1.5 rounded-full border border-secondary shadow-sm hover:border-primary transition-colors"
          >
            "N500 Glo airtime"
          </button>
          <button 
            type="button" 
            onClick={() => setPrompt("2GB MTN data for 08012345678")}
            className="text-[10px] font-bold bg-white px-3 py-1.5 rounded-full border border-secondary shadow-sm hover:border-primary transition-colors"
          >
            "2GB MTN data"
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
