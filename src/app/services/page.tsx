
"use client";

import Link from "next/link";
import { 
  Smartphone, 
  Wifi, 
  Tv, 
  Zap, 
  ShieldCheck, 
  CreditCard, 
  ArrowLeft,
  Search,
  ChevronRight,
  Gamepad2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";

const services = [
  { 
    category: "Mobile & Data",
    items: [
      { icon: Smartphone, label: "Airtime Top-up", desc: "Instantly recharge any network", href: "/services/airtime", color: "bg-blue-500" },
      { icon: Wifi, label: "Data Bundles", desc: "High-speed internet for all devices", href: "/services/data", color: "bg-green-500" },
    ]
  },
  { 
    category: "Entertainment & Gaming",
    items: [
      { icon: Gamepad2, label: "Game Top-up", desc: "COD, Free Fire, Bloodstrike", href: "/services/games", color: "bg-orange-500" },
      { icon: Tv, label: "Cable TV", desc: "DStv, GOtv, and StarTimes", href: "/services/cable", color: "bg-purple-500" },
    ]
  },
  { 
    category: "Utilities",
    items: [
      { icon: Zap, label: "Electricity", desc: "Prepaid and Postpaid meters", href: "/services/electricity", color: "bg-yellow-500" },
      { icon: ShieldCheck, label: "Third Party Insurance", desc: "Motor vehicle coverage certificate", href: "/services/insurance", color: "bg-red-500" },
    ]
  },
  { 
    category: "Others",
    items: [
      { icon: CreditCard, label: "Gift Cards", desc: "Global store vouchers", href: "/services/gift-cards", color: "bg-emerald-500" },
    ]
  }
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="p-6 bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft size={20} />
            </Button>
          </Link>
          <h1 className="text-xl font-black">All Services</h1>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input 
            placeholder="Search for a service..." 
            className="pl-10 h-12 rounded-2xl bg-secondary/50 border-none"
          />
        </div>
      </header>

      <main className="p-6 space-y-8 max-w-2xl mx-auto">
        {services.map((section) => ( section.items.length > 0 && (
          <div key={section.category} className="space-y-4">
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">
              {section.category}
            </h2>
            <div className="grid gap-3">
              {section.items.map((item) => (
                <Link key={item.label} href={item.href}>
                  <Card className="border-none shadow-sm hover:shadow-md transition-all active:scale-98 rounded-3xl">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl ${item.color} flex items-center justify-center text-white shadow-lg`}>
                          <item.icon size={22} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{item.label}</h3>
                          <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )))}

        <div className="bg-primary/5 rounded-[2rem] p-8 text-center border-2 border-dashed border-primary/20">
          <p className="text-sm font-bold text-primary mb-2">Can't find what you need?</p>
          <p className="text-xs text-muted-foreground mb-4">We're constantly adding new games and utility providers.</p>
          <Button variant="link" className="text-primary font-black">Suggest a Service</Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
