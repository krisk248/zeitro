"use client";

import { Timer, Plus, Coins } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

interface TopBarProps {
  currencyBalance: number;
  userName: string;
  onNewTask?: () => void;
}

export function TopBar({ currencyBalance, userName, onNewTask }: TopBarProps) {
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex h-12 items-center justify-between border-b border-border px-4">
      {/* Logo - mobile only */}
      <div className="flex items-center gap-2 md:hidden">
        <Timer className="h-4 w-4 text-foreground" strokeWidth={2} />
        <span className="font-heading text-sm font-semibold tracking-tight">Zeitro</span>
      </div>

      {/* Left spacer on desktop */}
      <div className="hidden md:block" />

      {/* Right section */}
      <div className="flex items-center gap-2">
        {/* Theme toggle - mobile only */}
        <ThemeToggle className="md:hidden h-7 w-7" />

        {/* New task - mobile */}
        <button
          onClick={onNewTask}
          className="flex h-7 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-background transition-transform hover:scale-[1.02] active:scale-[0.98] md:hidden"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
          <span className="text-xs font-medium">New</span>
        </button>

        {/* Currency */}
        <div className="flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1">
          <Coins className="h-3.5 w-3.5 text-chart-2" strokeWidth={1.5} />
          <span className="font-mono text-xs font-semibold countdown-digits">{currencyBalance}</span>
        </div>

        {/* Avatar */}
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
          {initial}
        </div>
      </div>
    </header>
  );
}
