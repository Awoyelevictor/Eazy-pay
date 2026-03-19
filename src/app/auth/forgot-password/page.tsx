
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  
  const auth = useAuth();
  const { toast } = useToast();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !email) return;
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
      toast({
        title: "Reset Link Sent",
        description: "Check your email for instructions to reset your password/PIN.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <Link href="/auth/login" className="inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2" size={16} /> Back to Login
        </Link>

        <div className="text-center">
          <h1 className="text-3xl font-black text-foreground">Reset Security</h1>
          <p className="text-muted-foreground mt-2">We'll send you a link to recover access</p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8">
            {!sent ? (
              <form onSubmit={handleReset} className="space-y-6">
                <div className="space-y-2">
                  <Label>Account Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      type="email" 
                      placeholder="name@example.com"
                      className="h-14 pl-12 rounded-2xl bg-secondary/30 border-none"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-lg" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>Send Reset Link <Send className="ml-2" size={18} /></>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4 space-y-4">
                <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={32} />
                </div>
                <h3 className="text-xl font-bold">Check Your Email</h3>
                <p className="text-sm text-muted-foreground">
                  We've sent recovery instructions to <span className="font-bold text-foreground">{email}</span>.
                </p>
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full mt-4 rounded-2xl h-12 border-secondary">
                    Return to Login
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
