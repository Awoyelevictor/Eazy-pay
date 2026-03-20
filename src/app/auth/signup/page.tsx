
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
  AlertCircle,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: "",
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
      if (!formData.email || !formData.displayName) {
        toast({ title: "Check inputs", description: "Please fill in all fields.", variant: "destructive" });
        return;
      }
      setStep(2);
    }
  };

  const handleSignup = async () => {
    if (!auth || !firestore) return;
    if (formData.pin.length < 4) {
      toast({ title: "PIN too short", description: "Create at least a 4-digit PIN.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Create Auth User using PIN as the password
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.pin);
      const user = userCredential.user;

      // 2. Set Display Name
      await updateProfile(user, {
        displayName: formData.displayName
      });

      // 3. Create Profile in Firestore
      const profileData = {
        email: formData.email,
        displayName: formData.displayName,
        balance: 0,
        transactionPin: formData.pin,
        isVerified: false,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(firestore, "users", user.uid), profileData);

      // 4. Send Verification
      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn("Verification email failed to send", e);
      }

      localStorage.setItem("eazypay_last_email", formData.email);

      toast({
        title: "Account Created!",
        description: "Registration complete. Please sign in with your PIN.",
      });
      
      router.push("/auth/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = error.message;
      if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
      } else if (error.code === 'auth/weak-password') {
        message = "Your PIN must be at least 6 characters for Firebase security (try a longer PIN).";
      }
      
      setErrorMessage(message);
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
          <h1 className="text-4xl font-black text-foreground tracking-tight">Eazy-pay</h1>
          <p className="text-muted-foreground mt-2 font-medium">Create your secure wallet account</p>
        </div>

        {errorMessage && (
          <Alert variant="destructive" className="rounded-2xl border-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Registration Error</AlertTitle>
            <AlertDescription className="text-xs">
              {errorMessage}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between mb-8 px-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary -translate-y-1/2 z-0" />
          {[1, 2].map((s) => (
            <div 
              key={s} 
              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-black relative z-10 transition-all duration-300 ${
                step >= s ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "bg-secondary text-muted-foreground"
              }`}
            >
              {step > s ? <CheckCircle2 size={20} /> : s}
            </div>
          ))}
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      placeholder="John Doe"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none font-medium"
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none font-medium"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                  Next: Security PIN <ArrowRight className="ml-2" size={20} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                  <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-4 shadow-inner">
                    <ShieldCheck size={40} />
                  </div>
                  <h3 className="text-2xl font-black">Secure PIN</h3>
                  <p className="text-sm text-muted-foreground px-4">Create a 6-digit PIN to login and authorize payments.</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    type="password" 
                    placeholder="••••••"
                    maxLength={6}
                    autoFocus
                    className="h-24 text-center text-5xl tracking-[1.5rem] font-black rounded-[2rem] bg-secondary/30 border-none shadow-inner"
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                  />
                  <p className="text-center text-[10px] font-black text-primary uppercase tracking-[0.2em]">Minimum 6 digits required</p>
                </div>
                <div className="space-y-4">
                  <Button 
                    onClick={handleSignup} 
                    className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                    disabled={loading || formData.pin.length < 6}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" /> Finalizing...
                      </div>
                    ) : "Create My Account"}
                  </Button>
                  <button onClick={() => setStep(1)} className="w-full text-sm text-muted-foreground font-bold hover:text-primary transition-colors">Go Back</button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground font-medium">
          Already a member? <Link href="/auth/login" className="text-primary font-black hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
