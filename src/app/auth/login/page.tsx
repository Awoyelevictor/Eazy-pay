
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ArrowRight, UserCircle, Smartphone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(false);
  const [isNewDevice, setIsNewDevice] = useState(true);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const savedEmail = localStorage.getItem("eazypay_last_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setIsNewDevice(false);
      setShowPinScreen(true);
    }
  }, []);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setShowPinScreen(true);
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!auth || !firestore || !email || !password) return;
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      localStorage.setItem("eazypay_last_email", email);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // For users who use their PIN as a simplified password (or if they prefer)
  const handlePinLogin = async () => {
    if (!auth || !email || !pin) return;
    setLoading(true);

    try {
      // We attempt login with the PIN. 
      // If the user set their password as their PIN at signup, this works.
      // If they have a separate password, they can toggle to the password screen.
      await signInWithEmailAndPassword(auth, email, pin);
      localStorage.setItem("eazypay_last_email", email);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Access Denied",
        description: "The PIN entered is incorrect for this account.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="h-20 w-20 bg-primary rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-primary/20 transition-transform hover:scale-105">
             <Lock size={40} />
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight">Eazy-pay</h1>
          <p className="text-muted-foreground mt-2 font-medium">Fast & Secure Access</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-md">
          <CardContent className="p-8">
            {!showPinScreen ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Account Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-16 pl-12 rounded-2xl bg-secondary/30 border-none text-lg font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-16 rounded-3xl font-black text-xl shadow-xl shadow-primary/20">
                  Continue <ArrowRight className="ml-2" size={24} />
                </Button>
              </form>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Welcome Back</p>
                  <p className="text-lg font-bold text-primary truncate px-4">{email}</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-center block uppercase tracking-[0.3em] text-[10px] font-black opacity-40">Enter Security PIN</Label>
                    <Input 
                      type="password" 
                      placeholder="••••"
                      maxLength={6}
                      autoFocus
                      className="h-24 text-center text-5xl tracking-[1.5rem] font-black rounded-[2rem] bg-secondary/30 border-none shadow-inner"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>

                  <Button 
                    onClick={handlePinLogin} 
                    className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 transition-all active:scale-95"
                    disabled={loading || pin.length < 4}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : "Unlock Account"}
                  </Button>
                  
                  <div className="flex flex-col gap-4 text-center">
                    <button 
                      onClick={() => setShowPinScreen(false)} 
                      className="text-xs text-muted-foreground font-black uppercase tracking-widest hover:text-primary transition-colors"
                    >
                      Use Different Account
                    </button>
                    <Link href="/auth/forgot-password">
                      <button className="text-xs text-primary font-black uppercase tracking-widest">Forgot Security PIN?</button>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground font-medium">
          New here? <Link href="/auth/signup" className="text-primary font-black hover:underline">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
