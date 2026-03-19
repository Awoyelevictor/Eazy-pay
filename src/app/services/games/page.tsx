
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Gamepad2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { processPayment, getVariations } from "@/app/actions/vtpass";
import { createAINotification } from "@/services/notification-service";

const gameProviders = [
  { name: "Call of Duty Mobile", vtuId: "codm", icon: Gamepad2 },
  { name: "Free Fire", vtuId: "freefire", icon: Gamepad2 },
  { name: "Bloodstrike", vtuId: "bloodstrike", icon: Gamepad2 },
];

export default function GameTopupPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGame, setSelectedGame] = useState<typeof gameProviders[0] | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedBundleCode, setSelectedBundleId] = useState("");
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  // Fetch variations when a game is selected
  useEffect(() => {
    const fetchBundles = async () => {
      if (!selectedGame) return;
      setLoadingVariations(true);
      setVariations([]);
      setSelectedBundleId("");
      try {
        const data = await getVariations(selectedGame.vtuId);
        if (data.response_description === "000" || data.code === "000") {
          setVariations(data.content?.variations || []);
        } else {
          throw new Error("Could not fetch game bundles");
        }
      } catch (error: any) {
        toast({ title: "Provider Error", description: error.message, variant: "destructive" });
      } finally {
        setLoadingVariations(false);
      }
    };
    fetchBundles();
  }, [selectedGame, toast]);

  const selectedBundle = useMemo(() => {
    return variations.find(v => v.variation_code === selectedBundleCode);
  }, [variations, selectedBundleCode]);

  const generateRequestId = () => {
    const now = new Date();
    const dateStr = now.getFullYear() + 
                    (now.getMonth() + 1).toString().padStart(2, "0") + 
                    now.getDate().toString().padStart(2, "0") + 
                    now.getHours().toString().padStart(2, "0") + 
                    now.getMinutes().toString().padStart(2, "0");
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    return `${dateStr}${randomDigits}`;
  };

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedGame || !selectedBundle) return;
    
    if (!playerId) {
      toast({ title: "Player ID Required", variant: "destructive" });
      return;
    }

    const price = parseFloat(selectedBundle.variation_amount);
    if (profile && profile.balance < price) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = generateRequestId();
      
      const result = await processPayment({
        request_id: requestId,
        serviceID: selectedGame.vtuId,
        billersCode: playerId,
        variation_code: selectedBundle.variation_code,
        amount: price,
        phone: user.email || "08000000000"
      });

      if (result.code !== '000') {
        throw new Error(result.response_description || "Top-up Failed");
      }

      // 1. Log transaction
      const transactionData = {
        type: "games",
        amount: price,
        network: selectedGame.name,
        service: selectedBundle.name,
        recipient: playerId,
        status: "success",
        requestId: requestId,
        createdAt: new Date().toISOString(),
      };

      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);

      // 2. Deduct balance
      await updateDoc(userRef, { balance: increment(-price) });

      // 3. AI Notification
      await createAINotification(
        firestore,
        user.uid,
        `Successfully credited ${selectedBundle.name} to Player ID ${playerId} for ${selectedGame.name}`,
        user.displayName || ''
      );

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Game Top-up Error:", error);
      toast({
        title: "Top-up Error",
        description: error.message,
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
        <h1 className="text-3xl font-black mb-3">Top-up Sent!</h1>
        <p className="text-muted-foreground mb-10 max-w-xs mx-auto">
          {selectedBundle?.name} has been credited to Player ID <span className="font-bold text-foreground">{playerId}</span>.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => {
            setIsSuccess(false);
            setPlayerId("");
            setSelectedBundleId("");
            setSelectedGame(null);
          }}>
            Buy More
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
            <Label className="text-xs font-bold uppercase text-muted-foreground">1. Select Game</Label>
            <div className="grid grid-cols-1 gap-3">
              {gameProviders.map((p) => (
                <button
                  key={p.vtuId}
                  onClick={() => setSelectedGame(p)}
                  className={`h-16 rounded-2xl border px-4 transition-all font-bold flex items-center justify-between ${
                    selectedGame?.vtuId === p.vtuId ? "bg-primary/10 border-primary text-primary" : "bg-white border-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center">
                      <Gamepad2 size={20} className={selectedGame?.vtuId === p.vtuId ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    {p.name}
                  </div>
                  {selectedGame?.vtuId === p.vtuId && <CheckCircle2 size={18} />}
                </button>
              ))}
            </div>
          </div>

          {selectedGame && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">2. Player ID / UID</Label>
                <Input
                  placeholder="e.g. 1234567890"
                  className="h-14 rounded-2xl border-secondary bg-white font-bold"
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                />
                <p className="text-[10px] text-muted-foreground px-1 italic">Carefully check your ID. Transactions are irreversible.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">3. Choose Bundle</Label>
                {loadingVariations ? (
                  <div className="flex items-center justify-center p-8 bg-secondary/20 rounded-2xl">
                    <Loader2 className="animate-spin text-primary mr-2" />
                    <span className="text-sm font-medium">Fetching packages...</span>
                  </div>
                ) : variations.length > 0 ? (
                  <Select onValueChange={setSelectedBundleId} value={selectedBundleCode}>
                    <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                      <SelectValue placeholder="Select credits package" />
                    </SelectTrigger>
                    <SelectContent>
                      {variations.map((v) => (
                        <SelectItem key={v.variation_code} value={v.variation_code}>
                          {v.name} - ₦{parseFloat(v.variation_amount).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 bg-amber-50 text-amber-700 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> No bundles available for this provider right now.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {selectedBundle && (
          <Card className="bg-primary/5 border-none rounded-[2rem]">
            <CardContent className="p-6 flex gap-4 text-primary">
              <Info size={24} className="flex-shrink-0" />
              <div className="text-sm font-medium">
                <p>Wallet Balance: <span className="font-black">₦{profile?.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}</span></p>
                <p className="mt-1 opacity-70">Top-up Cost: ₦{parseFloat(selectedBundle.variation_amount).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/20" 
          onClick={handlePurchase}
          disabled={isProcessing || !selectedBundle || !playerId}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : `Pay ₦${selectedBundle ? parseFloat(selectedBundle.variation_amount).toLocaleString() : "0"}`}
        </Button>
      </main>
    </div>
  );
}
