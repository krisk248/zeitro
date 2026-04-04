<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { LayoutDashboard, BarChart3, Settings, Timer, Plus, Zap, LogOut } from 'lucide-svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import { logout } from '$lib/auth';

  let { onNewTask }: { onNewTask?: () => void } = $props();

  type NavItem = 'dashboard' | 'habits' | 'analytics' | 'settings';

  const NAV_ROUTES: Record<NavItem, string> = {
    dashboard: '/',
    habits: '/habits',
    analytics: '/analytics',
    settings: '/settings',
  };

  const navItems: { id: NavItem; icon: typeof LayoutDashboard; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'habits', icon: Zap, label: 'Habits' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  function getActive(): NavItem {
    const pathname = $page.url.pathname;
    if (pathname.startsWith('/habits')) return 'habits';
    if (pathname.startsWith('/analytics')) return 'analytics';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'dashboard';
  }

  let active = $derived(getActive());
</script>

<aside class="hidden md:flex w-[52px] flex-col items-center border-r border-border bg-background py-4 gap-1">
  <!-- Logo -->
  <div class="mb-6 flex h-8 w-8 items-center justify-center">
    <Timer class="h-5 w-5 text-foreground" strokeWidth={2} />
  </div>

  <!-- New task -->
  <button
    onclick={onNewTask}
    class="mb-4 flex h-8 w-8 items-center justify-center rounded-md bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
  >
    <Plus class="h-4 w-4" strokeWidth={2.5} />
  </button>

  <!-- Nav items -->
  <nav class="flex flex-1 flex-col items-center gap-1">
    {#each navItems as item}
      {@const isActive = active === item.id}
      <button
        onclick={() => goto(NAV_ROUTES[item.id])}
        class="group relative flex h-9 w-9 items-center justify-center rounded-md transition-colors {isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'}"
        title={item.label}
      >
        <item.icon class="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.5} />
        <span class="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100">
          {item.label}
        </span>
      </button>
    {/each}
  </nav>

  <!-- Bottom actions -->
  <ThemeToggle />
  <button
    onclick={() => logout()}
    class="mt-1 flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    title="Logout"
  >
    <LogOut class="h-[18px] w-[18px]" strokeWidth={1.5} />
  </button>
</aside>
