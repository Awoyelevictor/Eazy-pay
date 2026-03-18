
import { ArrowDown, ArrowUp, Filter, Search } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { TransactionList } from "@/components/dashboard/TransactionList";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b flex items-center justify-between">
        <h1 className="text-xl font-bold">My Wallet</h1>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Search size={20} />
        </Button>
      </header>

      <main className="p-6 max-w-4xl mx-auto space-y-6">
        <Card className="bg-primary text-primary-foreground rounded-[2.5rem] p-4 border-none shadow-xl">
          <CardContent className="p-4 text-center">
            <p className="text-primary-foreground/70 text-sm mb-2">Total Balance</p>
            <h2 className="text-4xl font-black mb-8 tracking-tight">₦45,250.00</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-3xl p-4 flex flex-col items-center gap-1 backdrop-blur-sm">
                <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center mb-1">
                  <ArrowDown size={16} className="text-green-300" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Incoming</p>
                <p className="text-lg font-bold">₦12,400</p>
              </div>
              <div className="bg-white/10 rounded-3xl p-4 flex flex-col items-center gap-1 backdrop-blur-sm">
                <div className="h-8 w-8 rounded-full bg-red-500/20 flex items-center justify-center mb-1">
                  <ArrowUp size={16} className="text-red-300" />
                </div>
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Outgoing</p>
                <p className="text-lg font-bold">₦8,200</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-between pt-4">
           <h3 className="text-lg font-bold">History</h3>
           <Button variant="outline" size="sm" className="rounded-full gap-2 border-secondary text-foreground">
             <Filter size={14} /> Filter
           </Button>
        </div>

        <TransactionList />
      </main>

      <BottomNav />
    </div>
  );
}
