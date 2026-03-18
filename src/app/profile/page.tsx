"use client";

import { 
  Settings, 
  User, 
  Shield, 
  CreditCard, 
  HelpCircle, 
  LogOut, 
  ChevronRight, 
  CheckCircle, 
  Loader2,
  Mail,
  Smartphone,
  Key
} from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { IS_LIVE_MODE } from "@/firebase/config";
import Link from "next/link";

const menuItems = [
  { icon: User, label: "Personal Information", desc: "Name, email, and basic info" },
  { icon: Shield, label: "Security & KYC", desc: "Linked account and verification", status: "Verified" },
  { icon: CreditCard, label: "Payment Methods", desc: "Manage cards and Paystack links" },
  { icon: HelpCircle, label: "Support & Help", desc: "FAQs and contact support" },
  { icon: Settings, label: "Settings", desc: "Notifications and app preferences" },
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
            <div className="h-24 w-24 rounded-full border-4 border-white overflow-hidden bg-white/20 shadow-2xl">
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
              {IS_LIVE_MODE ? "Verified Production Account" : "Demo Account"}
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-6 max-w-xl mx-auto">
        {/* Authentication Summary */}
        <section className="space-y-3">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">Account Authentication</h2>
          <Card className="rounded-3xl border-none shadow-sm bg-secondary/30">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <Mail size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">Signed in via</p>
                    <p className="text-sm font-bold">Google Auth</p>
                  </div>
                </div>
                <div className="px-2 py-1 rounded-lg bg-green-100 text-green-700 text-[10px] font-black uppercase">Active</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm">
                    <Key size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-muted-foreground uppercase leading-none mb-1">User ID</p>
                    <p className="text-[10px] font-mono opacity-60 truncate max-w-[150px]">{user.uid}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Menu Items */}
        <div className="space-y-3">
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest px-1">General Settings</h2>
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
          
          {!IS_LIVE_MODE && (
            <Link href="/setup">
              <Card className="border-2 border-amber-200 bg-amber-50 shadow-sm hover:shadow-md transition-all cursor-pointer rounded-3xl mt-4">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
                      <Settings size={22} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-amber-900">Developer Settings</h3>
                      <p className="text-xs text-amber-700/70">Manage Firebase project connection</p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-amber-700" />
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        <Button 
          variant="destructive" 
          className="w-full h-16 rounded-3xl gap-2 font-black text-lg shadow-xl shadow-red-100 mt-4 transition-transform active:scale-95"
          onClick={handleSignOut}
        >
          <LogOut size={22} /> Sign Out
        </Button>

        <p className="text-center text-[10px] text-muted-foreground font-medium">
          FyreVTU App v2.5.0 (Production Stable)<br/>
          Securely powered by Firebase & Paystack
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
