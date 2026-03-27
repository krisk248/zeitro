"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Timer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth, ApiError } from "@/lib/auth-context";

export default function SignupPage() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await register(email, password, displayName);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="w-full max-w-[340px]">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
          <Timer className="h-5 w-5 text-background" strokeWidth={2} />
        </div>
        <span className="font-heading text-lg font-semibold tracking-tight">Zeitro</span>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Create your account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayName" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Display name
          </Label>
          <Input
            id="displayName"
            type="text"
            autoComplete="name"
            placeholder="Kannan"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-9"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="h-9"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={isPending} className="mt-1 h-9 w-full">
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[12px] text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity">
          Sign in
        </Link>
      </p>
    </div>
  );
}
