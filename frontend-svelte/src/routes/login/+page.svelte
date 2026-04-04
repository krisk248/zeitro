<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { Timer } from 'lucide-svelte';
  import { login, isLoading, user } from '$lib/auth';
  import { ApiError } from '$lib/api';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let isPending = $state(false);

  $effect(() => {
    if (!$isLoading && $user) {
      goto('/');
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = null;
    isPending = true;
    try {
      await login(email, password);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
      error = msg;
      toast.error(msg);
    } finally {
      isPending = false;
    }
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
  <div class="w-full max-w-[340px]">
    <!-- Logo -->
    <div class="mb-8 flex flex-col items-center gap-2">
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground">
        <Timer class="h-5 w-5 text-background" strokeWidth={2} />
      </div>
      <span class="font-heading text-lg font-semibold tracking-tight">Zeitro</span>
      <p class="text-[11px] uppercase tracking-widest text-muted-foreground">
        Sign in to continue
      </p>
    </div>

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label for="email" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autocomplete="email"
          placeholder="you@example.com"
          bind:value={email}
          required
          class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          bind:value={password}
          required
          class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
        />
      </div>

      {#if error}
        <p class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {error}
        </p>
      {/if}

      <button
        type="submit"
        disabled={isPending}
        class="mt-1 h-9 w-full rounded-md bg-foreground text-sm font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>

    <p class="mt-6 text-center text-[12px] text-muted-foreground">
      No account?{' '}
      <a href="/signup" class="text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity">
        Create one
      </a>
    </p>
  </div>
</div>
