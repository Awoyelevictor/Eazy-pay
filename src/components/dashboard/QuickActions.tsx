
"use client";

import Link from "next/link";
import { Smartphone, Wifi, Tv, Zap, ShieldCheck, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const actions = [
  { icon: Smartphone, label: "Airtime", href: "/services/airtime", color: "bg-blue-100 text-blue-600" },
  { icon: Wifi, label: "Data", href: "/services/data", color: "bg-green-100 text-green-600" },
  { icon: Tv, label: "Cable TV", href: "/services/cable", color: "bg-purple-100 text-purple-600" },
  { icon: Zap, label: "Electricity", href: "/services/electricity", color: "bg-yellow-100 text-yellow-600" },
  { icon: ShieldCheck, label: "Insurance", href: "/services/insurance", color: "bg-red-100 text-red-600" },
  { icon: CreditCard, label: "Gift Cards", href: "/services/gift-cards", color: "bg-orange-100 text-orange-600" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 py-4">
      {actions.map(({ icon: Icon, label, href, color }) => (
        <Link
          key={label}
          href={href}
          className="flex flex-col items-center space-y-2 group"
        >
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105 shadow-sm",
            color
          )}>
            <Icon size={24} />
          </div>
          <span className="text-xs font-medium text-foreground/80">{label}</span>
        </Link>
      ))}
    </div>
  );
}
