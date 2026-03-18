
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
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecutePurchase = async () => {
    if (!user || !firestore || !userRef || !parsedResult || !profile) return;

    // Check balance (Simple validation for MVP)
    const cost = parsedResult.serviceType === 'data' ? (parsedResult.amount > 100 ? parsedResult.amount : 500) : parsedResult.amount;
    
    if (profile.balance < cost) {
      toast({
        title: "Insufficient Balance",
        description: `You need at least ₦${cost} for this transaction.`,
        variant: "destructive",
      });
      setParsedResult(null);
      return;
    }

    setIsExecuting(true);

    const transactionData = {
      type: parsedResult.serviceType,
      amount: cost,
      network: parsedResult.networkProvider !== 'unknown' ? parsedResult.networkProvider : "Default",
      recipient: parsedResult.phoneNumber || user.phoneNumber || "My Number",
      status: "success",
      createdAt: new Date().toISOString(),
      aiGenerated: true
    };

    // 1. Deduct balance
    updateDoc(userRef, {
      balance: increment(-cost)
    }).catch(async () => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: userRef.path,
        operation: 'update',
        requestResourceData: { balance: increment(-cost) }
      }));
    });

    // 2. Add transaction
    const transactionsRef = collection(firestore, "users", user.uid, "transactions");
    addDoc(transactionsRef, transactionData)
      .then(() => {
        toast({
          title: "Purchase Successful!",
          description: parsedResult.confirmationMessage,
        });
        setParsedResult(null);
      })
      .catch(async () => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: transactionsRef.path,
          operation: 'create',
          requestResourceData: transactionData
        }));
      })
      .finally(() => {
        setIsExecuting(false);
      });
  };

  if (parsedResult) {
    return (
      <Card className="border-primary bg-primary/5 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300 rounded-[2rem]">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center text-white">
              <Sparkles size={20} className="fill-white" />
            </div>
            <div>
              <p className="text-xs font-black text-primary uppercase tracking-widest">AI Confirmation</p>
              <h3 className="text-sm font-bold text-foreground">Is this correct?</h3>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed italic">
            "{parsedResult.confirmationMessage}"
          </p>

          <div className="flex gap-3">
            <Button 
              className="flex-1 rounded-2xl h-12 font-bold shadow-md"
              onClick={handleExecutePurchase}
              disabled={isExecuting}
            >
              {isExecuting ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" size={18} />}
              Confirm
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 rounded-2xl h-12 font-bold border-secondary"
              onClick={() => setParsedResult(null)}
              disabled={isExecuting}
            >
              <X className="mr-2" size={18} />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-accent bg-secondary/30 shadow-inner rounded-[2rem]">
      <CardHeader className="pb-3 px-6">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4 fill-primary" />
          Fyre AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <form onSubmit={handleAssistantSubmit} className="relative">
          <Input
            placeholder="e.g. N1000 MTN data for 080123..."
            className="h-14 pr-12 bg-background border-none rounded-2xl shadow-sm focus-visible:ring-primary"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isLoading}
          />
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute right-2 top-2 h-10 w-10 text-primary hover:text-accent rounded-xl"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-3 px-1 font-medium">
          Try: <span className="text-primary font-bold">"N500 Glo airtime"</span> or <span className="text-primary font-bold">"2GB data for my number"</span>
        </p>
      </CardContent>
    </Card>
  );
}
