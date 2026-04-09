
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useUser, useFirestore, useDoc } from "@/firebase";
import { doc, collection, addDoc, updateDoc, increment } from "firebase/firestore";
import { processPeyflexData, getPeyflexDataPlans } from "@/app/actions/peyflex";
import { getSMEPlugNetworkId } from "@/lib/network";
import { createAINotification } from "@/services/notification-service";
import { useEffect } from "react";

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M" },
  { name: "Glo", color: "bg-green-600", logo: "G" },
  { name: "Airtel", color: "bg-red-600", logo: "A" },
  { name: "9mobile", color: "bg-emerald-900", logo: "9" },
];

export default function DataPurchase() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [selectedNetwork, setSelectedNetwork] = useState<typeof networks[0] | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [allPlans, setAllPlans] = useState<any[]>([]); // SMEPlug returns all plans at once
  const [selectedBundle, setSelectedBundle] = useState<any | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const userRef = useMemo(() => {
    if (!firestore || !user) return null;
    return doc(firestore, "users", user.uid);
  }, [firestore, user]);

  const { data: profile } = useDoc(userRef);

  // Fetch ALL plans from Peyflex on mount
  useEffect(() => {
    setIsLoadingPlans(true);
    // Peyflex requires network parameter, so we'll fetch plans for all networks
    const networks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE'];
    const promises = networks.map(network => getPeyflexDataPlans(network));
    
    Promise.allSettled(promises)
      .then(results => {
        let allPlans: any[] = [];
        results.forEach((result, index) => {
          const network = networks[index];
          
          if (result.status === 'fulfilled') {
            const res = result.value;
            console.log(`✅ ${network} plans response:`, JSON.stringify(res).slice(0, 200));
            
            // Handle different response formats
            const plans = res.data ?? res.plans ?? res.result ?? (Array.isArray(res) ? res : []);
            if (Array.isArray(plans) && plans.length > 0) {
              // Use the network identifier from response (e.g., "glo_data"), not the uppercase name
              const networkId = res.network || network.toLowerCase() + '_data';
              
              // Add network info to each plan using the actual network ID from response
              const plansWithNetwork = plans.map(plan => ({ 
                ...plan, 
                network: networkId,  // Use actual network ID from API response
                displayNetwork: network  // Keep display name for UI
              }));
              allPlans = allPlans.concat(plansWithNetwork);
              console.log(`📊 Added ${plans.length} plans for ${network} (network ID: ${networkId})`);
            } else {
              console.warn(`⚠️ No valid plans found in response for ${network}`);
            }
          } else {
            console.error(`❌ ${network} data fetch failed:`, result.reason);
          }
        });
        
        // Keep only valid plan objects
        const validPlans = allPlans.filter(p => typeof p === 'object' && p !== null);
        console.log(`📈 Total valid plans loaded: ${validPlans.length}`);
        console.log(`   Plans structure:`, validPlans.slice(0, 2)); // Log first 2 plans to see structure
        setAllPlans(validPlans);
        
        if (validPlans.length === 0) {
          console.warn("⚠️ No valid data plans loaded from any network");
        }
      })
      .catch(err => console.error("Plan Fetch Error:", err))
      .finally(() => setIsLoadingPlans(false));
  }, []);

  const availableBundles = useMemo(() => {
    if (!selectedNetwork || !Array.isArray(allPlans) || allPlans.length === 0) {
      console.log("🔍 No bundles available:", { 
        selectedNetwork: selectedNetwork?.name, 
        allPlanCount: allPlans?.length || 0 
      });
      return [];
    }
    
    // Map display network name to actual network ID used in plans
    const networkIdMap: Record<string, string> = {
      'MTN': 'mtn_data',
      'Glo': 'glo_data',
      'Airtel': 'airtel_data',
      '9mobile': '9mobile_data'
    };
    const networkId = networkIdMap[selectedNetwork.name];
    
    console.log(`🔍 Filtering plans for network: ${selectedNetwork.name} → ID: ${networkId}`);
    console.log(`   Total plans loaded: ${allPlans.length}`);
    console.log(`   Available networks in plans:`, [...new Set(allPlans.map(p => p.network))]);
    
    const filtered = allPlans.filter(p => {
      const match = p.network === networkId;
      return match;
    });

    console.log(`📊 Available bundles for ${selectedNetwork.name}: ${filtered.length}`);
    if (filtered.length > 0) {
      console.log(`   Sample plan:`, filtered[0]);
    }
    return filtered;
  }, [allPlans, selectedNetwork]);

  const handlePurchase = async () => {
    if (!user || !firestore || !userRef || !selectedBundle || !selectedNetwork) return;
    
    const cost = parseFloat(selectedBundle.price || selectedBundle.amount);
    if (profile && profile.balance < cost) {
      toast({ title: "Insufficient Balance", variant: "destructive" });
      return;
    }

    setIsProcessing(true);

    try {
      // Peyflex API expects plan_id and network
      const planId = selectedBundle.plan_id ?? selectedBundle.id ?? selectedBundle.api_code ?? selectedBundle.data_plan ?? selectedBundle.plan_code;
      console.log("Purchasing data plan:", { planId, bundle: selectedBundle });

      const result = await processPeyflexData({
        network: selectedNetwork.name.toUpperCase(),
        plan_code: planId,
        mobile_number: phoneNumber,
      });

      if (result.status && result.status.toLowerCase() === 'failed') {
        throw new Error(result.message || "Subscription failed at Peyflex gateway");
      }

      // 1. Deduct balance
      await updateDoc(userRef, { balance: increment(-cost) });

      // 2. Log transaction
      const transactionData = {
        type: "data",
        category: "cost",  // ← Mark as COST (PeyFlex expense)
        amount: cost,
        network: selectedNetwork.name,
        recipient: phoneNumber,
        service: selectedBundle.label || selectedBundle.name || selectedBundle.plan_name || selectedBundle.allowance,
        planCode: selectedBundle.plan_code,
        status: "success",
        requestId: result.reference || result.id || `PEYFLEX-DT-${Date.now()}`,
        createdAt: new Date().toISOString(),
        provider: "Peyflex"
      };
      const transactionsRef = collection(firestore, "users", user.uid, "transactions");
      await addDoc(transactionsRef, transactionData);
      
      // 3. AI Notification
      await createAINotification(
        firestore,
        user.uid,
        `Successfully subscribed ${selectedBundle.label || selectedBundle.name || selectedBundle.allowance} for ${phoneNumber} via Peyflex`,
        user.displayName || ''
      );

      setIsSuccess(true);
    } catch (error: any) {
      console.error("Data Purchase Error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
    setIsProcessing(false);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8">
          <CheckCircle2 size={56} className="animate-bounce" />
        </div>
        <h1 className="text-3xl font-black mb-3">Data Sent!</h1>
        <p className="text-muted-foreground mb-8">{selectedBundle?.label || selectedBundle?.name || selectedBundle?.plan_name} sent to {phoneNumber}.</p>
        <div className="w-full max-w-xs space-y-4">
          <Button className="w-full rounded-2xl h-14" onClick={() => setIsSuccess(false)}>Buy More</Button>
          <Link href="/dashboard" className="block"><Button variant="outline" className="w-full rounded-2xl h-14">Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  // Group plans by validity/duration type
  const CATEGORIES = ["Daily", "Weekly", "Monthly", "Others"] as const;
  type Category = typeof CATEGORIES[number];
  const [activeCategory, setActiveCategory] = useState<Category>("Daily");

  const categorizedBundles = useMemo<Record<Category, any[]>>(() => {
    const groups: Record<Category, any[]> = { Daily: [], Weekly: [], Monthly: [], Others: [] };
    for (const b of availableBundles) {
      // Parse the label field which contains info like "200MB =N250 (2Days)" or "500MB = N280 (30 Days)"
      const label = (b.label || b.name || b.plan_name || b.allowance || "").toLowerCase();
      const combined = label; // label already has all the info we need

      // Extract days from pattern like "(2days)", "(7days)", "(30 days)", etc.
      const dayMatch = combined.match(/\((\d+)\s*days?\)/i);
      const days = dayMatch ? parseInt(dayMatch[1]) : 0;

      console.log(`📋 Categorizing: "${label}" → ${days} days`);

      if (days >= 28 || combined.includes("month") || combined.includes("30 day")) {
        groups.Monthly.push(b);
      } else if (days >= 7 || combined.includes("week") || combined.includes("7 day")) {
        groups.Weekly.push(b);
      } else if (days >= 1 || combined.includes("daily") || combined.includes("24hr") || combined.includes("1 day") || combined.includes("2 day") || combined.includes("3 day")) {
        groups.Daily.push(b);
      } else {
        groups.Others.push(b);
      }
    }
    console.log(`✅ Categorized ${availableBundles.length} plans:`, { 
      Daily: groups.Daily.length, 
      Weekly: groups.Weekly.length, 
      Monthly: groups.Monthly.length, 
      Others: groups.Others.length 
    });
    return groups;
  }, [availableBundles]);

  const displayedPlans = categorizedBundles[activeCategory];

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4 border-b sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft size={24} /></Button></Link>
        <h1 className="text-xl font-black">Buy Data</h1>
      </header>

      <main className="px-6 py-8 space-y-8 max-w-xl mx-auto pb-24">
        <section>
          <Label className="text-xs font-black mb-4 block text-muted-foreground uppercase tracking-widest">1. Select Network</Label>
          <div className="grid grid-cols-4 gap-3">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => { setSelectedNetwork(net); setSelectedBundle(null); }}
                className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all ${
                  selectedNetwork?.name === net.name ? "bg-primary/5 border-primary" : "bg-white border-secondary dark:bg-slate-900"
                }`}
              >
                <div className={`h-12 w-12 rounded-xl ${net.color} flex items-center justify-center text-white font-black text-xl`}>
                  {net.logo}
                </div>
                <span className="text-[10px] font-bold">{net.name}</span>
              </button>
            ))}
          </div>
        </section>

        {selectedNetwork && (
          <section className="space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-muted-foreground">Recipient Number</Label>
              <Input
                type="tel"
                placeholder="080 0000 0000"
                className="h-16 rounded-2xl font-bold"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-black uppercase text-muted-foreground">Select Bundle</Label>
                {isLoadingPlans && <Loader2 className="animate-spin h-4 w-4 text-primary" />}
              </div>

              {/* Category Tabs */}
              {availableBundles.length > 0 && (
                <div className="flex gap-2 p-1 bg-secondary/40 rounded-2xl">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => { setActiveCategory(cat); setSelectedBundle(null); }}
                      className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                        activeCategory === cat
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cat}
                      {categorizedBundles[cat].length > 0 && (
                        <span className="ml-1 opacity-70">({categorizedBundles[cat].length})</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid gap-3 max-h-72 overflow-y-auto pr-1">
                {availableBundles.length === 0 && !isLoadingPlans && (
                  <p className="text-center py-8 text-sm text-slate-400 italic">No bundles available at the moment.</p>
                )}
                {displayedPlans?.length === 0 && availableBundles.length > 0 && (
                  <p className="text-center py-6 text-sm text-slate-400 italic">No {activeCategory.toLowerCase()} plans available.</p>
                )}
                {displayedPlans?.map((b, i) => (
                  <button
                    key={`plan-${activeCategory}-${i}`}
                    onClick={() => setSelectedBundle(b)}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                      selectedBundle && JSON.stringify(selectedBundle) === JSON.stringify(b)
                        ? "bg-primary/5 border-primary"
                        : "bg-white border-secondary dark:bg-slate-900"
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-bold text-sm">{b.label || b.name || b.plan_name || b.allowance || b.data_plan || "Data Plan"}</p>
                      {(b.validity || b.duration || b.period) && (
                        <p className="text-xs text-muted-foreground">{b.validity || b.duration || b.period}</p>
                      )}
                    </div>
                    <span className="font-black text-primary text-base">₦{b.price || b.amount || b.plan_price}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <Button
          className="w-full h-16 rounded-3xl text-xl font-black shadow-2xl"
          onClick={handlePurchase}
          disabled={isProcessing || !selectedBundle}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : "Subscribe Now"}
        </Button>
      </main>
    </div>
  );
}
