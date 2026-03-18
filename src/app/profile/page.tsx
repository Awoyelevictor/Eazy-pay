
"use client";

import { Settings, User, Shield, CreditCard, HelpCircle, LogOut, ChevronRight, CheckCircle, Loader2 } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

const menuItems = [
  { icon: User, label: "Personal Information", desc: "Name, email, phone number" },
  { icon: Shield, label: "Security & KYC", desc: "Level 2 Verified", status: "Verified" },
  { icon: CreditCard, label: "Payment Methods", desc: "Manage cards and bank accounts" },
  { icon: HelpCircle, label: "Support & Help", desc: "Chat with us, FAQs" },
  { icon: Settings, label: "Settings", desc: "App preferences, notifications" },
];

export default function ProfilePage() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    if (!auth) return;
    await signOut(auth);
    router.push("/");
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="p-8 bg-primary text-primary-foreground rounded-b-[3rem] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <User size={180} />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="relative">
            <div className="h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-white/20">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <User size={48} className="m-auto mt-4" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 bg-accent text-accent-foreground h-7 w-7 rounded-full flex items-center justify-center border-2 border-primary">
              <CheckCircle size={14} />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black">{user.displayName || "User"}</h1>
            <p className="text-sm opacity-80">{user.email}</p>
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-white/20 text-[10px] font-bold uppercase tracking-wider">
              Premium Account
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        <div className="space-y-3">
          {menuItems.map((item) => (
            <Card key={item.label} className="border-none shadow-sm hover:shadow-md transition-all cursor-pointer group rounded-3xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-secondary flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <item.icon size={22} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{item.label}</h3>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.status && (
                    <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                      {item.status}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button 
          variant="destructive" 
          className="w-full h-14 rounded-3xl gap-2 font-bold shadow-lg shadow-red-100"
          onClick={handleSignOut}
        >
          <LogOut size={20} /> Sign Out
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">
          FyreVTU App v2.4.0 (Build 2024.1)
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
