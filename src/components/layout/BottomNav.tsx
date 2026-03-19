
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Wallet, Grid, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", href: "/dashboard" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Grid, label: "Services", href: "/services" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t h-16 flex items-center justify-around px-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
      {navItems.map(({ icon: Icon, label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-all duration-200 flex-1",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <div className={cn(
              "p-1 rounded-xl transition-colors",
              isActive && "bg-primary/10"
            )}>
              <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
            </div>
            <span className={cn("text-[10px] font-bold uppercase tracking-tighter", isActive ? "opacity-100" : "opacity-70")}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
