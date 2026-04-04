<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { LayoutDashboard, BarChart3, Settings, Zap } from 'lucide-svelte';

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

<nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background md:hidden">
  <div class="mx-auto flex h-14 max-w-md items-center justify-around">
    {#each navItems as item}
      {@const isActive = active === item.id}
      <button
        onclick={() => goto(NAV_ROUTES[item.id])}
        class="flex flex-col items-center gap-0.5 px-4 py-1 transition-colors {isActive ? 'text-foreground' : 'text-muted-foreground'}"
      >
        <item.icon class="h-5 w-5" strokeWidth={isActive ? 2 : 1.5} />
        <span class="text-[10px] font-medium tracking-wide">{item.label}</span>
      </button>
    {/each}
  </div>
</nav>
