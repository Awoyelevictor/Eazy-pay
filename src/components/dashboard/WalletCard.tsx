
"use client";

import { useState } from "react";
import { Eye, EyeOff, Plus, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WalletCard() {
  const [showBalance, setShowBalance] = useState(true);
  const balance = "45,250.00";

  return (
    <Card className="bg-primary text-primary-foreground overflow-hidden relative shadow-xl border-none">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <Wallet size={120} />
      </div>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-primary-foreground/80 text-sm font-medium">Available Balance</p>
          <button onClick={() => setShowBalance(!showBalance)} className="hover:opacity-80 transition-opacity">
            {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <h2 className="text-3xl font-bold mb-6">
          ₦ {showBalance ? balance : "****.**"}
        </h2>
        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90 border-none shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Fund Wallet
          </Button>
          <Button variant="outline" className="flex-1 rounded-full bg-white/10 hover:bg-white/20 border-white/20 text-white shadow-sm">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Transfer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Wallet({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}
