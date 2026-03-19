
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2, Gamepad2, AlertCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { processShagoGameTopup, getShagoVariations } from "@/app/actions/shago";
import { createAINotification } from "@/services/notification-service";

// Shago Product Codes for supported games
const gameProviders = [
  { name: "Call of Duty Mobile (Global)", shagoId: "CODM", icon: Gamepad2 },
  { name: "Free Fire (Diamonds)", shagoId: "FREEFIRE", icon: Gamepad2 },
  { name: "Bloodstrike", shagoId: "BLOODSTRIKE", icon: Gamepad2 },
  { name: "Mobile Legends", shagoId: "MOBILE_LEGENDS", icon: Gamepad2 },
  { name: "PUBG Mobile", shagoId: "PUBG", icon: Gamepad2 },
];

export default function GameTopupPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGame, setSelectedGame] = useState<typeof gameProviders[0] | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedBundleCode, setSelectedBundleCode] = useState("");
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  // Fetch variations when a game is selected via Shago
  useEffect(() => {
    const fetchBundles = async () => {
      if (!selectedGame) return;
      setLoadingVariations(true);
      setVariations([]);
      setSelectedBundleCode("");
      try {
        const data = await getShagoVariations(selectedGame.shagoId);
        if (data.status === '200' || data.status === 200) {
          setVariations(data.variations || []);
        } else {
          // If Shago is not configured or fails, provide some fallback bundles for demo
          console.warn("Shago variations failed, using demo bundles");
          setVariations([
            { productCode: `${selectedGame.shagoId}_SMALL`, name: "Small Pack", amount: 500 },
            { productCode: `${selectedGame.shagoId}_MEDIUM`, name: "Medium Pack", amount: 2000 },
            { productCode: `${selectedGame.shagoId}_LARGE`, name: "Large Pack", amount: 5000 },
          ]);
        }
      } catch (error: any) {
        console.error("Shago Error:", error);
        toast({ title: "Provider Connection", description: "Running in Demo mode for games.", variant: "default" });
        // Demo fallback
        setVariations([
          { productCode: `${selectedGame.shagoId}_SMALL`, name: "80 Credits/Diamonds", amount: 500 },
          { productCode: `${selectedGame.shagoId}_MEDIUM`, name: "420 Credits/Diamonds", amount: 2500 },
          { productCode: `${selectedGame.shagoId}_LARGE`, name: "1000 Credits/Diamonds", amount: 6000 },
        ]);
      } finally {
        setLoadingVariations(false);
      }
    };
    fetchBundles();
  }, [selectedGame, toast]);

  const selectedBundle = useMemo(() => {
    return variations.find(v => v.productCode === selectedBundleCode);
  }, [variations, selectedBundleCode]);

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedGame || !selectedBundle) return;
    
    if (!playerId) {
      toast({ title: "Player ID Required", variant: "destructive" });
      return;
    }

    const price = parseFloat(selectedBundle.amount);
    if (profile && profile.balance < price) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = `GAME-${Date.now()}`;
      
      const result = await processShagoGameTopup({
        request_id: requestId,
        productCode: selectedBundle.productCode,
        customerIdentifier: playerId,
        amount: price,
      });

      // Shago success status is usually 200
      if (result.status !== 200 && result.status !== '200') {
        throw new Error(result.message || "Top-up Failed");
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
        `Successfully credited ${selectedBundle.name} to Player ID ${playerId} via Shago Gaming`,
        user.displayName || ''
      );

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Game Top-up Error:", error);
      
      // For demo purposes, we'll allow a "Simulated Success" if the key is default
      if (error.message.includes("SHAGO_HASH_KEY_HERE")) {
         toast({ title: "Demo Mode", description: "Successful simulation! (Add your Shago Hash Key for live delivery)" });
         // Deduct balance and log anyway for the demo experience
         await updateDoc(userRef, { balance: increment(-price) });
         await addDoc(collection(firestore, "users", user.uid, "transactions"), {
            type: "games",
            amount: price,
            network: selectedGame.name,
            service: selectedBundle.name,
            recipient: playerId,
            status: "success",
            createdAt: new Date().toISOString(),
         });
         setIsSuccess(true);
      } else {
        toast({ title: "Top-up Error", description: error.message, variant: "destructive" });
      }
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
            setSelectedBundleCode("");
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
        <h1 className="text-xl font-black">Pro Gaming Top-up</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">1. Select Game Platform</Label>
            <div className="grid grid-cols-1 gap-3">
              {gameProviders.map((p) => (
                <button
                  key={p.shagoId}
                  onClick={() => setSelectedGame(p)}
                  className={`h-16 rounded-2xl border px-4 transition-all font-bold flex items-center justify-between ${
                    selectedGame?.shagoId === p.shagoId ? "bg-primary/10 border-primary text-primary" : "bg-white border-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center">
                      <Gamepad2 size={20} className={selectedGame?.shagoId === p.shagoId ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    {p.name}
                  </div>
                  {selectedGame?.shagoId === p.shagoId && <CheckCircle2 size={18} />}
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
                <p className="text-[10px] text-muted-foreground px-1 italic">Credits are usually delivered within 5-15 minutes.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">3. Choose Bundle</Label>
                {loadingVariations ? (
                  <div className="flex items-center justify-center p-8 bg-secondary/20 rounded-2xl">
                    <Loader2 className="animate-spin text-primary mr-2" />
                    <span className="text-sm font-medium">Fetching Shago bundles...</span>
                  </div>
                ) : variations.length > 0 ? (
                  <Select onValueChange={setSelectedBundleCode} value={selectedBundleCode}>
                    <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                      <SelectValue placeholder="Select credits package" />
                    </SelectTrigger>
                    <SelectContent>
                      {variations.map((v) => (
                        <SelectItem key={v.productCode} value={v.productCode}>
                          {v.name} - ₦{parseFloat(v.amount).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 bg-amber-50 text-amber-700 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> Select a game to see available bundles.
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
                <p className="mt-1 opacity-70">Top-up Cost: ₦{parseFloat(selectedBundle.amount).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/20" 
          onClick={handlePurchase}
          disabled={isProcessing || !selectedBundle || !playerId}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : `Pay ₦${selectedBundle ? parseFloat(selectedBundle.amount).toLocaleString() : "0"}`}
        </Button>
      </main>
    </div>
  );
}
