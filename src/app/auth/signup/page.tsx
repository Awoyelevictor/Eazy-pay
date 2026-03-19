
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  CheckCircle2,
  Smartphone,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    pin: "",
  });
  
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleNextStep = () => {
    setErrorMessage(null);
    if (step === 1) {
      if (!formData.email || !formData.password || formData.password !== formData.confirmPassword) {
        toast({ title: "Check inputs", description: "Ensure passwords match and fields are filled.", variant: "destructive" });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (formData.pin.length < 4) {
        toast({ title: "PIN too short", description: "Create at least a 4-digit PIN.", variant: "destructive" });
        return;
      }
      setStep(3);
    }
  };

  const handleSignup = async () => {
    if (!auth || !firestore) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Create Profile in Firestore
      await setDoc(doc(firestore, "users", user.uid), {
        email: formData.email,
        displayName: formData.displayName || formData.email.split('@')[0],
        balance: 0,
        transactionPin: formData.pin,
        isVerified: false,
        createdAt: new Date().toISOString()
      });

      // 3. Send Verification
      await sendEmailVerification(user);

      toast({
        title: "Account Created!",
        description: "Verification email sent. Please check your inbox.",
      });
      
      router.push("/auth/login");
    } catch (error: any) {
      let message = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is not enabled. Please go to your Firebase Console > Authentication > Sign-in method and enable 'Email/Password'.";
        setErrorMessage(message);
      }
      
      toast({
        title: "Signup Failed",
        description: message,
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
          <h1 className="text-3xl font-black text-foreground">Join Eazy-pay</h1>
          <p className="text-muted-foreground mt-2 text-sm">Secure mobile & game top-ups</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="rounded-2xl border-2 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Configuration Required</AlertTitle>
            <AlertDescription className="text-xs">
              {errorMessage}
              <Link href="/setup" className="block mt-2 font-bold underline">Open Setup Guide</Link>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between mb-8 px-4 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2 z-0" />
          {[1, 2, 3].map((s) => (
            <div 
              key={s} 
              className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold relative z-10 transition-colors ${
                step >= s ? "bg-primary text-white" : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > s ? <CheckCircle2 size={16} /> : s}
            </div>
          ))}
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleNextStep} className="w-full h-14 rounded-2xl font-bold text-lg">
                  Continue <ArrowRight className="ml-2" size={20} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-6">
                  <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-4">
                    <ShieldCheck size={32} />
                  </div>
                  <h3 className="text-xl font-bold">Create Security PIN</h3>
                  <p className="text-xs text-muted-foreground">Used to log in and authorize payments.</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-center block mb-4 uppercase tracking-widest text-[10px] font-black opacity-60">Enter 4-6 Digits</Label>
                  <Input 
                    type="password" 
                    placeholder="••••"
                    maxLength={6}
                    autoFocus
                    className="h-20 text-center text-4xl tracking-[1.5rem] font-black rounded-3xl bg-secondary/30 border-none shadow-inner"
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                  />
                </div>
                <Button onClick={handleNextStep} className="w-full h-16 rounded-3xl font-bold text-lg" disabled={formData.pin.length < 4}>
                  Set PIN <ArrowRight className="ml-2" size={20} />
                </Button>
                <button onClick={() => setStep(1)} className="w-full text-sm text-muted-foreground font-medium">Back to email</button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 text-center">
                <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-4">
                  <CheckCircle2 size={40} />
                </div>
                <h3 className="text-xl font-bold">Ready to Launch</h3>
                <p className="text-sm text-muted-foreground">
                  We'll send a verification link to <span className="font-bold text-foreground">{formData.email}</span>.
                </p>
                <Button 
                  onClick={handleSignup} 
                  className="w-full h-16 rounded-3xl font-black text-xl shadow-xl shadow-primary/20"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Verify & Create Account"}
                </Button>
                <button onClick={() => setStep(2)} className="w-full text-sm text-muted-foreground font-medium">Change PIN</button>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account? <Link href="/auth/login" className="text-primary font-bold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
