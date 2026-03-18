
"use client";

import { useMemo } from "react";
import { Smartphone, Wifi, Zap, ArrowDownLeft, ArrowUpRight, Clock, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUser, useCollection, useFirestore } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

export function TransactionList() {
  const { user } = useUser();
  const firestore = useFirestore();

  const transactionsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, "users", user.uid, "transactions"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
  }, [firestore, user]);

  const { data: transactions, loading, error } = useCollection(transactionsQuery);

  const getIcon = (type: string) => {
    switch (type) {
      case "airtime": return Smartphone;
      case "data": return Wifi;
      case "funding": return ArrowDownLeft;
      default: return Clock;
    }
  };

  if (error) {
    return (
      <div className="p-6 text-center bg-destructive/10 rounded-2xl border border-destructive/20 text-destructive flex flex-col items-center gap-2">
        <AlertCircle size={24} />
        <p className="text-sm font-medium">Failed to load transactions</p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between px-0 pb-4">
        <CardTitle className="text-lg font-bold">Recent Transactions</CardTitle>
        <button className="text-primary text-sm font-medium hover:underline">See All</button>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-secondary/50">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-secondary shadow-inner">
            <Clock className="mx-auto text-muted-foreground mb-3 opacity-20" size={48} />
            <p className="text-sm text-muted-foreground font-medium">No transactions yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your recent activity will appear here.</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const Icon = getIcon(tx.type);
            const isCredit = tx.type === "funding";
            const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'Processing...';

            return (
              <div key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-secondary/50 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "h-10 w-10 rounded-full flex items-center justify-center transition-colors",
                    isCredit ? "bg-green-100 text-green-600" : "bg-secondary text-primary"
                  )}>
                    <Icon size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm capitalize">{tx.type} • {tx.network || tx.service || "Payment"}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{dateStr}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn("font-black text-sm", isCredit ? "text-green-600" : "text-foreground")}>
                    {isCredit ? "+" : "-"}₦{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                  <p className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mt-1 shadow-sm", 
                    tx.status === "success" ? "bg-green-100 text-green-700" : 
                    tx.status === "failed" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700")}>
                    {tx.status}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
