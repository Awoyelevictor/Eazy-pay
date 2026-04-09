
"use client";

import { CheckCircle2, XCircle, Copy, ExternalLink, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const ENV_VARS = [
  { key: "NEXT_PUBLIC_FIREBASE_API_KEY", label: "API Key", value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY },
  { key: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", label: "Auth Domain", value: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN },
  { key: "NEXT_PUBLIC_FIREBASE_PROJECT_ID", label: "Project ID", value: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID },
  { key: "NEXT_PUBLIC_FIREBASE_APP_ID", label: "App ID", value: process.env.NEXT_PUBLIC_FIREBASE_APP_ID },
];

export default function SetupWizard() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${text} copied to clipboard.`,
    });
  };

  const isConfigured = ENV_VARS.every(v => v.value && v.value.length > 5);

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center space-y-8">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
          <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl font-black mb-2">Live Connection Wizard</h1>
        <p className="text-muted-foreground">Follow these steps to enable live payments and authentication.</p>
      </div>

      <div className="w-full max-w-2xl grid gap-6">
        {/* Status Card */}
        <Card className={`border-2 ${isConfigured ? 'border-green-500 bg-green-50/30' : 'border-amber-500 bg-amber-50/30'}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Connection Status</CardTitle>
                <CardDescription>
                  {isConfigured ? "All systems go! Your app is live." : "Running in Demo Mode. Connect your project below."}
                </CardDescription>
              </div>
              {isConfigured ? (
                <CheckCircle2 className="text-green-500" size={32} />
              ) : (
                <Zap className="text-amber-500 animate-pulse" size={32} />
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Steps Card */}
        <Card className="rounded-[2.5rem] border-none shadow-xl">
          <CardHeader>
            <CardTitle>1. Create Firebase Web App</CardTitle>
            <CardDescription>Go to Firebase Console &gt; Project Settings &gt; General &gt; Your Apps</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Link href="https://console.firebase.google.com/" target="_blank">
              <Button className="w-full h-12 rounded-xl font-bold gap-2">
                Open Firebase Console <ExternalLink size={16} />
              </Button>
            </Link>

            <div className="space-y-3">
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">2. Set Environment Variables</p>
              <div className="grid gap-2">
                {ENV_VARS.map((v) => (
                  <div key={v.key} className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl border border-secondary">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-muted-foreground uppercase">{v.label}</span>
                      <code className="text-xs truncate max-w-[200px]">{v.key}</code>
                    </div>
                    <div className="flex items-center gap-3">
                      {v.value && v.value.length > 5 ? (
                        <CheckCircle2 size={18} className="text-green-500" />
                      ) : (
                        <XCircle size={18} className="text-red-400" />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(v.key)}>
                        <Copy size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Link href="/dashboard" className="w-full">
          <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-secondary">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
