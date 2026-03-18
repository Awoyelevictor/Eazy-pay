
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const networks = [
  { name: "MTN", color: "bg-yellow-400", logo: "M" },
  { name: "Glo", color: "bg-green-500", logo: "G" },
  { name: "Airtel", color: "bg-red-500", logo: "A" },
  { name: "9mobile", color: "bg-emerald-800", logo: "9" },
];

export default function AirtimePurchase() {
  const [selectedNetwork, setSelectedNetwork] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handlePurchase = () => {
    if (!selectedNetwork || !phoneNumber || !amount) {
      toast({
        title: "Missing Info",
        description: "Please fill all fields to proceed.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      toast({
        title: "Success",
        description: `Successfully topped up ₦${amount} to ${phoneNumber}.`,
      });
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <h1 className="text-3xl font-black mb-2">Top-up Successful!</h1>
        <p className="text-muted-foreground mb-8">
          The amount of ₦{amount} has been successfully sent to {phoneNumber}.
        </p>
        <div className="w-full space-y-3">
          <Button className="w-full rounded-full h-12" onClick={() => setIsSuccess(false)}>
            Buy Again
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full rounded-full h-12">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="p-6 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Buy Airtime</h1>
      </header>

      <main className="px-6 space-y-8 max-w-xl mx-auto">
        {/* Network Selection */}
        <section>
          <Label className="text-sm font-bold mb-4 block">Select Network</Label>
          <div className="grid grid-cols-4 gap-3">
            {networks.map((net) => (
              <button
                key={net.name}
                onClick={() => setSelectedNetwork(net.name)}
                className={`flex flex-col items-center gap-2 group p-2 rounded-2xl transition-all ${
                  selectedNetwork === net.name ? "bg-primary/10 ring-2 ring-primary" : "bg-white border"
                }`}
              >
                <div className={`h-12 w-12 rounded-xl ${net.color} flex items-center justify-center text-white font-black text-xl shadow-sm`}>
                  {net.logo}
                </div>
                <span className="text-[10px] font-bold">{net.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Form */}
        <section className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-bold">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="08012345678"
              className="h-14 rounded-2xl bg-white border-secondary/50 focus-visible:ring-primary"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount" className="text-sm font-bold">Amount (₦)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g. 500"
              className="h-14 rounded-2xl bg-white border-secondary/50 focus-visible:ring-primary"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="flex gap-2 mt-2 overflow-x-auto pb-2 no-scrollbar">
              {["100", "200", "500", "1000", "2000", "5000"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(preset)}
                  className="px-4 py-1.5 rounded-full bg-secondary text-primary text-xs font-bold border border-primary/20 hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                >
                  ₦{preset}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Info Card */}
        <Card className="bg-blue-50 border-none shadow-none rounded-3xl">
          <CardContent className="p-4 flex gap-3 text-blue-700">
            <Info size={20} className="flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium leading-relaxed">
              Standard cashback of 3% applies to all airtime purchases. Funds will be deducted from your main wallet balance.
            </p>
          </CardContent>
        </Card>

        <Button 
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all hover:scale-[1.02]" 
          onClick={handlePurchase}
          disabled={isProcessing}
        >
          {isProcessing ? "Processing Transaction..." : "Proceed to Payment"}
        </Button>
      </main>
    </div>
  );
}
