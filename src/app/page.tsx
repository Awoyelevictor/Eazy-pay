
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Smartphone, ShieldCheck, Zap, Gamepad2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="text-primary-foreground h-5 w-5 fill-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">Eazy-pay</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl mb-8 group">
          <Image 
            src="https://picsum.photos/seed/eazypay-hero/1200/600" 
            alt="Eazy-pay Dashboard" 
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            data-ai-hint="finance gaming"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-foreground mb-4 leading-tight">
          Mobile & Game Credits <span className="text-primary">Instant</span>.
        </h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
          The fastest way to manage your airtime, data, utility bills, and game top-ups. 
          Secure, seamless, and smarter than ever before.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button className="w-full sm:px-12 h-14 rounded-full text-lg shadow-xl hover:scale-105 transition-all">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:px-12 h-14 rounded-full text-lg border-primary text-primary hover:bg-primary/5">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 w-full text-left">
          {[
            { icon: Smartphone, title: "Swift Top-up", desc: "Airtime, data, and game credits sent in milliseconds." },
            { icon: Gamepad2, title: "Pro Gaming", desc: "Top up CODM, Free Fire, and Bloodstrike instantly." },
            { icon: Zap, title: "Smart Automation", desc: "Use our AI assistant for one-command purchases." },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col gap-3 p-6 bg-white rounded-2xl shadow-sm border border-secondary">
              <div className="h-10 w-10 bg-secondary rounded-xl flex items-center justify-center text-primary">
                <feature.icon size={24} />
              </div>
              <h3 className="font-bold text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="p-8 text-center text-sm text-muted-foreground">
        © 2024 Eazy-pay. All rights reserved.
      </footer>
    </div>
  );
}
