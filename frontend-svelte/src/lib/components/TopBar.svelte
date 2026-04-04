<script lang="ts">
  import { Timer, Plus, Coins, LogOut } from 'lucide-svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import { logout } from '$lib/auth';

  let {
    currencyBalance,
    userName,
    onNewTask,
  }: {
    currencyBalance: number;
    userName: string;
    onNewTask?: () => void;
  } = $props();

  let initial = $derived(userName.charAt(0).toUpperCase());
</script>

<header class="flex h-12 items-center justify-between border-b border-border px-4">
  <!-- Logo - mobile only -->
  <div class="flex items-center gap-2 md:hidden">
    <Timer class="h-4 w-4 text-foreground" strokeWidth={2} />
    <span class="font-heading text-sm font-semibold tracking-tight">Zeitro</span>
  </div>

  <!-- Left spacer on desktop -->
  <div class="hidden md:block"></div>

  <!-- Right section -->
  <div class="flex items-center gap-2">
    <!-- Theme toggle - mobile only -->
    <ThemeToggle class="md:hidden h-7 w-7" />

    <!-- New task - mobile -->
    <button
      onclick={onNewTask}
      class="flex h-7 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-background transition-transform hover:scale-[1.02] active:scale-[0.98] md:hidden"
    >
      <Plus class="h-3.5 w-3.5" strokeWidth={2.5} />
      <span class="text-xs font-medium">New</span>
    </button>

    <!-- Currency -->
    <div class="flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1">
      <Coins class="h-3.5 w-3.5 text-chart-2" strokeWidth={1.5} />
      <span class="font-mono text-xs font-semibold countdown-digits">{currencyBalance}</span>
    </div>

    <!-- Avatar -->
    <div class="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
      {initial}
    </div>

    <!-- Logout -->
    <button
      onclick={() => logout()}
      class="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      title="Logout"
    >
      <LogOut class="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  </div>
</header>
