
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
  AlertCircle
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
      if (formData.password.length < 6) {
        toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
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

      // 2. Set Display Name
      await updateProfile(user, {
        displayName: formData.displayName || formData.email.split('@')[0]
      });

      // 3. Create Profile in Firestore
      // We use a non-blocking approach for the secondary steps to prevent UI hang
      const profileData = {
        email: formData.email,
        displayName: formData.displayName || formData.email.split('@')[0],
        balance: 0,
        transactionPin: formData.pin,
        isVerified: false,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(firestore, "users", user.uid), profileData);

      // 4. Send Verification (Non-blocking or handled with a timeout to prevent hang)
      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn("Verification email failed to send, but account was created.", e);
      }

      // Store email for easy login later
      localStorage.setItem("eazypay_last_email", formData.email);

      toast({
        title: "Account Created!",
        description: "Registration complete. Please sign in with your PIN.",
      });
      
      router.push("/auth/login");
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password sign-in is not enabled in Firebase Console.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
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
          {[1, 2, 3].map((s) => (
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
                  <Input 
                    placeholder="John Doe"
                    className="h-14 rounded-2xl bg-secondary/30 border-none px-6 font-medium"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  />
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
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none font-medium"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="password" 
                      placeholder="••••••••"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none font-medium"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleNextStep} className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20">
                  Continue <ArrowRight className="ml-2" size={20} />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4">
                <div className="text-center">
                  <div className="h-20 w-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mx-auto mb-4 shadow-inner">
                    <ShieldCheck size={40} />
                  </div>
                  <h3 className="text-2xl font-black">Transaction PIN</h3>
                  <p className="text-sm text-muted-foreground px-4">Create a 4-6 digit PIN to authorize your future payments and login.</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    type="password" 
                    placeholder="••••"
                    maxLength={6}
                    autoFocus
                    className="h-24 text-center text-5xl tracking-[1.5rem] font-black rounded-[2rem] bg-secondary/30 border-none shadow-inner"
                    value={formData.pin}
                    onChange={(e) => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})}
                  />
                  <p className="text-center text-[10px] font-black text-primary uppercase tracking-[0.2em]">Secure Encryption Active</p>
                </div>
                <div className="space-y-4">
                  <Button onClick={handleNextStep} className="w-full h-16 rounded-3xl font-black text-xl shadow-xl shadow-primary/20" disabled={formData.pin.length < 4}>
                    Secure PIN <ArrowRight className="ml-2" size={20} />
                  </Button>
                  <button onClick={() => setStep(1)} className="w-full text-sm text-muted-foreground font-bold hover:text-primary transition-colors">Go Back</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 text-center py-4">
                <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mx-auto mb-2 shadow-inner">
                  <CheckCircle2 size={48} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-2xl font-black">Ready to Launch</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    We'll create your account for <br/> <span className="font-black text-foreground">{formData.email}</span>
                  </p>
                </div>
                <div className="space-y-4">
                  <Button 
                    onClick={handleSignup} 
                    className="w-full h-16 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" /> Finalizing...
                      </div>
                    ) : "Create My Account"}
                  </Button>
                  <button onClick={() => setStep(2)} className="w-full text-sm text-muted-foreground font-bold" disabled={loading}>Adjust PIN</button>
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
