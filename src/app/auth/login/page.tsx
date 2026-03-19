
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Loader2, ArrowRight, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPinScreen, setShowPinScreen] = useState(false);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setShowPinScreen(true);
  };

  const handleLoginWithPin = async () => {
    if (!auth || !firestore) return;
    setLoading(true);

    try {
      // In this flow, the 'Password' is treated as the 'PIN' for simplicity
      // or we use a stored credential. For a standard Email/Pass login:
      // Users will use their PIN as the secret password.
      await signInWithEmailAndPassword(auth, email, pin);
      
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: "Invalid email or PIN. Please try again.",
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
          <div className="h-16 w-16 bg-primary rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-primary/20">
             <UserCircle size={40} />
          </div>
          <h1 className="text-3xl font-black text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Enter your credentials to continue</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            {!showPinScreen ? (
              <form onSubmit={handleEmailSubmit} className="space-y-6 animate-in fade-in slide-in-from-left-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <Input 
                    type="email" 
                    placeholder="name@example.com"
                    className="h-14 px-6 rounded-2xl bg-secondary/30 border-none text-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-lg">
                  Next <ArrowRight className="ml-2" size={20} />
                </Button>
              </form>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Logging in as</p>
                  <p className="text-lg font-bold text-primary mb-6">{email}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-center block mb-4 uppercase tracking-widest text-xs font-black">Enter Security PIN</Label>
                  <div className="relative">
                    <Input 
                      type="password" 
                      placeholder="••••"
                      maxLength={6}
                      autoFocus
                      className="h-20 text-center text-4xl tracking-[1.5rem] font-black rounded-3xl bg-secondary/30 border-none shadow-inner"
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleLoginWithPin} 
                  className="w-full h-16 rounded-3xl font-black text-xl shadow-xl shadow-primary/20"
                  disabled={loading || pin.length < 4}
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Unlock Account"}
                </Button>
                <div className="flex flex-col gap-3">
                  <button onClick={() => setShowPinScreen(false)} className="text-sm text-muted-foreground font-medium">Use different email</button>
                  <Link href="/auth/forgot-password" title="Reset PIN">
                    <button className="text-sm text-primary font-bold">Forgot PIN?</button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account? <Link href="/auth/signup" className="text-primary font-bold">Create Account</Link>
        </p>
      </div>
    </div>
  );
}
