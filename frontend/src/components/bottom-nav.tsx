"use client";

import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Settings } from "lucide-react";

type NavItem = "dashboard" | "analytics" | "settings";

const NAV_ROUTES: Record<NavItem, string> = {
  dashboard: "/",
  analytics: "/analytics",
  settings: "/settings",
};

const navItems: { id: NavItem; icon: typeof LayoutDashboard; label: string }[] = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "analytics", icon: BarChart3, label: "Analytics" },
  { id: "settings", icon: Settings, label: "Settings" },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  function getActive(): NavItem {
    if (pathname.startsWith("/analytics")) return "analytics";
    if (pathname.startsWith("/settings")) return "settings";
    return "dashboard";
  }

  const active = getActive();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
      <div className="mx-auto flex h-14 max-w-md items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => router.push(NAV_ROUTES[item.id])}
              className={`flex flex-col items-center gap-0.5 px-4 py-1 transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
