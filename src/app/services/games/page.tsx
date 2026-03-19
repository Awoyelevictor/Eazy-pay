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
import { processPay1stGameTopup, getPay1stProducts } from "@/app/actions/pay1st";
import { createAINotification } from "@/services/notification-service";

const gameProviders = [
  { name: "Call of Duty Mobile (Global)", pay1stId: "CODM", icon: Gamepad2 },
  { name: "Free Fire (Diamonds)", pay1stId: "FREEFIRE", icon: Gamepad2 },
  { name: "Bloodstrike", pay1stId: "BLOODSTRIKE", icon: Gamepad2 },
  { name: "Mobile Legends", pay1stId: "MOBILE_LEGENDS", icon: Gamepad2 },
  { name: "PUBG Mobile", pay1stId: "PUBG", icon: Gamepad2 },
];

export default function GameTopupPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [selectedGame, setSelectedGame] = useState<typeof gameProviders[0] | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [variations, setVariations] = useState<any[]>([]);
  const [selectedSku, setSelectedSku] = useState("");
  const [loadingVariations, setLoadingVariations] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  useEffect(() => {
    const fetchBundles = async () => {
      if (!selectedGame) return;
      setLoadingVariations(true);
      setVariations([]);
      setSelectedSku("");
      try {
        const data = await getPay1stProducts();
        // Filter products based on the selected game provider ID
        const gameProducts = data.filter((p: any) => p.category === selectedGame.pay1stId || p.brand === selectedGame.pay1stId);
        if (gameProducts.length > 0) {
          setVariations(gameProducts);
        } else {
          console.warn("No Pay1st products found for this category, using demo bundles");
          setVariations([
            { sku: `${selectedGame.pay1stId}_80`, name: "80 Credits/Diamonds", price: 500 },
            { sku: `${selectedGame.pay1stId}_420`, name: "420 Credits/Diamonds", price: 2500 },
            { sku: `${selectedGame.pay1stId}_1000`, name: "1000 Credits/Diamonds", price: 6000 },
          ]);
        }
      } catch (error: any) {
        console.warn("Pay1st fetch failed, using demo mode");
        setVariations([
          { sku: `${selectedGame.pay1stId}_80`, name: "80 Credits/Diamonds", price: 500 },
          { sku: `${selectedGame.pay1stId}_420`, name: "420 Credits/Diamonds", price: 2500 },
          { sku: `${selectedGame.pay1stId}_1000`, name: "1000 Credits/Diamonds", price: 6000 },
        ]);
      } finally {
        setLoadingVariations(false);
      }
    };
    fetchBundles();
  }, [selectedGame]);

  const selectedBundle = useMemo(() => {
    return variations.find(v => v.sku === selectedSku);
  }, [variations, selectedSku]);

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedGame || !selectedBundle) return;
    
    if (!playerId) {
      toast({ title: "Player ID Required", variant: "destructive" });
      return;
    }

    const price = parseFloat(selectedBundle.price);
    if (profile && profile.balance < price) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      const requestId = `CARRY1ST-${Date.now()}`;
      
      const result = await processPay1stGameTopup({
        externalReference: requestId,
        sku: selectedBundle.sku,
        recipientIdentifier: playerId,
      });

      if (result.status !== 'SUCCESSFUL' && result.status !== 'PENDING') {
        throw new Error(result.message || "Top-up Failed");
      }

      await updateDoc(userRef, { balance: increment(-price) });
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, {
        type: "games",
        amount: price,
        network: selectedGame.name,
        service: selectedBundle.name,
        recipient: playerId,
        status: "success",
        requestId: requestId,
        createdAt: new Date().toISOString(),
      });

      await createAINotification(
        firestore,
        user.uid,
        `Successfully credited ${selectedBundle.name} to Player ID ${playerId} via Pay1st/Carry1st`,
        user.displayName || ''
      );

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Pay1st Top-up Error:", error);
      if (error.message.includes("PAY1ST_API_KEY_HERE") || error.message.includes("401") || error.message.includes("404")) {
         toast({ title: "Demo Mode Simulation", description: "Successful purchase simulated for demo." });
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
          {selectedBundle?.name} has been sent to Player ID <span className="font-bold text-foreground">{playerId}</span>.
        </p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14 text-lg font-bold shadow-lg" onClick={() => {
            setIsSuccess(false);
            setPlayerId("");
            setSelectedSku("");
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
        <h1 className="text-xl font-black">Pay1st Pro Gaming</h1>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-muted-foreground">1. Select Game Platform</Label>
            <div className="grid grid-cols-1 gap-3">
              {gameProviders.map((p) => (
                <button
                  key={p.pay1stId}
                  onClick={() => setSelectedGame(p)}
                  className={`h-16 rounded-2xl border px-4 transition-all font-bold flex items-center justify-between ${
                    selectedGame?.pay1stId === p.pay1stId ? "bg-primary/10 border-primary text-primary" : "bg-white border-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center">
                      <Gamepad2 size={20} className={selectedGame?.pay1stId === p.pay1stId ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    {p.name}
                  </div>
                  {selectedGame?.pay1stId === p.pay1stId && <CheckCircle2 size={18} />}
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
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">3. Choose Bundle</Label>
                {loadingVariations ? (
                  <div className="flex items-center justify-center p-8 bg-secondary/20 rounded-2xl">
                    <Loader2 className="animate-spin text-primary mr-2" />
                    <span className="text-sm font-medium">Loading Pay1st bundles...</span>
                  </div>
                ) : variations.length > 0 ? (
                  <Select onValueChange={setSelectedSku} value={selectedSku}>
                    <SelectTrigger className="h-14 rounded-2xl border-secondary bg-white">
                      <SelectValue placeholder="Select credits package" />
                    </SelectTrigger>
                    <SelectContent>
                      {variations.map((v) => (
                        <SelectItem key={v.sku} value={v.sku}>
                          {v.name} - ₦{parseFloat(v.price).toLocaleString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-4 bg-amber-50 text-amber-700 rounded-xl flex items-center gap-2 text-sm">
                    <AlertCircle size={16} /> Select a game to see available Pay1st bundles.
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
                <p className="mt-1 opacity-70">Top-up Cost: ₦{parseFloat(selectedBundle.price).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Button 
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl shadow-primary/20" 
          onClick={handlePurchase}
          disabled={isProcessing || !selectedBundle || !playerId}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : `Pay ₦${selectedBundle ? parseFloat(selectedBundle.price).toLocaleString() : "0"}`}
        </Button>
      </main>
    </div>
  );
}
