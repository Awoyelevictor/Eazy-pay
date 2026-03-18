
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
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t h-16 flex items-center justify-around px-4 sm:hidden shadow-lg">
      {navItems.map(({ icon: Icon, label, href }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
