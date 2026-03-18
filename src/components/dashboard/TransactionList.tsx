
"use client";

import { Smartphone, Wifi, Zap, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const transactions = [
  { id: 1, type: "Data Purchase", amount: -1500, date: "Today, 10:24 AM", icon: Wifi, status: "Success", color: "text-red-500" },
  { id: 2, type: "Wallet Top-up", amount: 5000, date: "Yesterday, 4:12 PM", icon: ArrowDownLeft, status: "Success", color: "text-green-500" },
  { id: 3, type: "Airtime Purchase", amount: -200, date: "Feb 22, 11:05 AM", icon: Smartphone, status: "Success", color: "text-red-500" },
  { id: 4, type: "Electricity Bill", amount: -3000, date: "Feb 21, 9:30 AM", icon: Zap, status: "Pending", color: "text-yellow-500" },
];

export function TransactionList() {
  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between px-0">
        <CardTitle className="text-lg font-bold">Recent Transactions</CardTitle>
        <button className="text-primary text-sm font-medium hover:underline">See All</button>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-secondary/50">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                <tx.icon size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm">{tx.type}</p>
                <p className="text-xs text-muted-foreground">{tx.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn("font-bold text-sm", tx.amount > 0 ? "text-green-600" : "text-foreground")}>
                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} ₦
              </p>
              <p className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mt-1", 
                tx.status === "Success" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700")}>
                {tx.status}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
