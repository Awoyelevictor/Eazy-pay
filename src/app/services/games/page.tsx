
"use client";

import Link from "next/link";
import { ArrowLeft, Gamepad2, Timer, BellRing, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function GameComingSoon() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex items-center gap-4 sticky top-0 bg-background/80 backdrop-blur-md z-10 border-b">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft size={24} />
          </Button>
        </Link>
        <h1 className="text-xl font-black">Pro Gaming</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-8">
        <div className="relative">
          <div className="h-32 w-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center text-primary animate-pulse">
            <Gamepad2 size={64} />
          </div>
          <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-accent rounded-2xl flex items-center justify-center text-accent-foreground shadow-lg rotate-12">
            <Timer size={24} />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black tracking-tight">Leveling Up!</h2>
          <p className="text-muted-foreground font-medium leading-relaxed">
            Our Pro Gaming platform is currently under construction. We're integrating direct global top-ups for CODM, Free Fire, and Bloodstrike.
          </p>
        </div>

        <Card className="bg-secondary/30 border-none rounded-[2rem] w-full">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Sparkles size={20} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-widest text-left">What to expect</p>
            </div>
            <ul className="text-left space-y-3">
              {[
                "Instant UID Verification",
                "Bonus Credits on every top-up",
                "Support for 50+ Global Games",
                "AI-Powered Game Recommendations"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm font-bold opacity-80">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="w-full space-y-4 pt-4">
          <Button className="w-full h-16 rounded-3xl text-lg font-black gap-2 shadow-xl shadow-primary/20">
            <BellRing size={20} /> Notify Me on Launch
          </Button>
          <Link href="/dashboard" className="block">
            <Button variant="outline" className="w-full h-14 rounded-2xl font-bold border-secondary">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
