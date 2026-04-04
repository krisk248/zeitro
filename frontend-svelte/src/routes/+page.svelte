<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { Search, ArrowUpDown, LayoutGrid, List } from 'lucide-svelte';
  import { user, isLoading, refreshUser } from '$lib/auth';
  import { getTasks, checkPenalties, getTags } from '$lib/api';
  import type { Task, Tag } from '$lib/types/task';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import CountdownCard from '$lib/components/CountdownCard.svelte';
  import CreateTaskDialog from '$lib/components/CreateTaskDialog.svelte';

  type FilterStatus = 'all' | 'active' | 'overdue' | 'completed';
  type SortKey = 'deadline' | 'priority' | 'created';
  type ViewMode = 'grid' | 'list';

  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

  const FILTER_LABELS: { value: FilterStatus; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'completed', label: 'Completed' },
  ];

  const SORT_LABELS: { value: SortKey; label: string }[] = [
    { value: 'deadline', label: 'Deadline' },
    { value: 'priority', label: 'Priority' },
    { value: 'created', label: 'Created' },
  ];

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }

  let tasks = $state<Task[]>([]);
  let allTags = $state<Tag[]>([]);
  let selectedTagIds = $state<string[]>([]);
  let dialogOpen = $state(false);
  let search = $state('');
  let filterStatus = $state<FilterStatus>('all');
  let sortKey = $state<SortKey>('deadline');
  let viewMode = $state<ViewMode>('grid');

  onMount(() => {
    const stored = localStorage.getItem('zeitro-view-mode') as ViewMode | null;
    if (stored) viewMode = stored;
  });

  function toggleViewMode(mode: ViewMode) {
    viewMode = mode;
    localStorage.setItem('zeitro-view-mode', mode);
  }

  async function loadTasks() {
    try {
      const [data, tagsData] = await Promise.all([getTasks(), getTags()]);
      tasks = data;
      allTags = tagsData;
      return data;
    } catch {
      return null;
    }
  }

  async function runPenaltyCheck() {
    try {
      const result = await checkPenalties();
      if (result.penalties_applied > 0) {
        toast.warning(`${result.penalties_applied} overdue task${result.penalties_applied > 1 ? 's' : ''} penalised`);
        await loadTasks();
        refreshUser();
      }
    } catch { /* silent fail */ }
  }

  $effect(() => {
    const loading = $isLoading;
    const u = $user;
    if (!loading) {
      if (u) {
        loadTasks().then(data => {
          if (data !== null) runPenaltyCheck();
        });
      } else {
        goto('/login');
      }
    }
  });

  let allActiveTasks = $derived(tasks.filter(t => !t.is_completed));
  let allCompletedTasks = $derived(tasks.filter(t => t.is_completed));
  let totalReward = $derived(allActiveTasks.reduce((sum, t) => sum + t.reward_amount, 0));

  function getFilteredSorted(): Task[] {
    const q = search.trim().toLowerCase();
    const now = Date.now();

    let filtered = tasks.filter(t => {
      if (q && !t.title.toLowerCase().includes(q)) return false;
      if (filterStatus === 'active') { if (t.is_completed || new Date(t.deadline).getTime() <= now) return false; }
      else if (filterStatus === 'overdue') { if (t.is_completed || new Date(t.deadline).getTime() > now) return false; }
      else if (filterStatus === 'completed') { if (!t.is_completed) return false; }
      if (selectedTagIds.length > 0) {
        const taskTagIds = t.tags.map(tag => tag.id);
        if (!selectedTagIds.some(id => taskTagIds.includes(id))) return false;
      }
      return true;
    });

    filtered = [...filtered].sort((a, b) => {
      if (sortKey === 'deadline') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortKey === 'priority') return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
      if (sortKey === 'created') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return filtered;
  }

  let filteredSortedTasks = $derived(getFilteredSorted());
  let displayActiveTasks = $derived(filteredSortedTasks.filter(t => !t.is_completed));
  let displayCompletedTasks = $derived(filteredSortedTasks.filter(t => t.is_completed));
  let displayName = $derived($user?.display_name ?? 'there');
  let balance = $derived($user?.currency_balance ?? 0);
</script>

{#if $isLoading}
  <div class="flex h-screen items-center justify-center">
    <p class="text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</p>
  </div>
{:else}
  <div class="flex h-screen overflow-hidden">
    <Sidebar onNewTask={() => dialogOpen = true} />

    <div class="flex flex-1 flex-col overflow-hidden">
      <TopBar
        currencyBalance={balance}
        userName={displayName}
        onNewTask={() => dialogOpen = true}
      />

      <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
        <!-- Header -->
        <div class="px-6 pt-8 pb-2 md:px-8">
          <p class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 class="mt-1 font-heading text-xl font-semibold tracking-tight">
            {getGreeting()}, {displayName}
          </h1>
        </div>

        <!-- Stats row -->
        <div class="flex gap-6 px-6 pt-4 pb-6 md:px-8">
          <div>
            <p class="font-mono text-2xl font-bold countdown-digits">{allActiveTasks.length}</p>
            <p class="text-[11px] text-muted-foreground">Active</p>
          </div>
          <div class="w-px bg-border h-10"></div>
          <div>
            <p class="font-mono text-2xl font-bold countdown-digits">{allCompletedTasks.length}</p>
            <p class="text-[11px] text-muted-foreground">Done</p>
          </div>
          <div class="w-px bg-border h-10"></div>
          <div>
            <p class="font-mono text-2xl font-bold countdown-digits text-chart-2">{totalReward}</p>
            <p class="text-[11px] text-muted-foreground">At stake</p>
          </div>
        </div>

        <!-- Search + Filter + Sort -->
        <div class="px-6 pb-4 md:px-8 space-y-3">
          <!-- Search bar -->
          <div class="relative">
            <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              bind:value={search}
              placeholder="Search tasks..."
              class="h-8 w-full rounded-md border border-border/60 bg-secondary/40 pl-8 pr-3 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <!-- Filter pills + Sort toggle -->
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5 flex-wrap">
              {#each FILTER_LABELS as { value, label }}
                <button
                  onclick={() => filterStatus = value}
                  class="rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors {filterStatus === value ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'}"
                >
                  {label}
                </button>
              {/each}
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <!-- View toggle -->
              <div class="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <button
                  onclick={() => toggleViewMode('grid')}
                  class="rounded p-1 transition-colors {viewMode === 'grid' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
                  title="Grid view"
                >
                  <LayoutGrid class="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <button
                  onclick={() => toggleViewMode('list')}
                  class="rounded p-1 transition-colors {viewMode === 'list' ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
                  title="List view"
                >
                  <List class="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
              </div>

              <ArrowUpDown class="h-3 w-3 text-muted-foreground" />
              <div class="flex items-center gap-0.5">
                {#each SORT_LABELS as { value, label }}
                  <button
                    onclick={() => sortKey = value}
                    class="rounded px-2 py-0.5 text-[11px] font-medium transition-colors {sortKey === value ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground'}"
                  >
                    {label}
                  </button>
                {/each}
              </div>
            </div>
          </div>

          <!-- Tag filter pills -->
          {#if allTags.length > 0}
            <div class="flex items-center gap-1.5 flex-wrap">
              <button
                onclick={() => selectedTagIds = []}
                class="rounded px-2.5 py-0.5 text-[11px] font-medium transition-colors {selectedTagIds.length === 0 ? 'bg-foreground text-background' : 'border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40'}"
              >
                All Tags
              </button>
              {#each allTags as tag}
                {@const isActive = selectedTagIds.includes(tag.id)}
                <button
                  onclick={() => selectedTagIds = isActive ? selectedTagIds.filter(id => id !== tag.id) : [...selectedTagIds, tag.id]}
                  class="rounded px-2.5 py-0.5 text-[11px] font-medium transition-all"
                  style="background-color: {isActive ? tag.color + '20' : 'transparent'}; color: {isActive ? tag.color : 'var(--muted-foreground)'}; border: 1px solid {isActive ? tag.color + '50' : 'var(--border)'}"
                >
                  {tag.name}
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Active tasks -->
        {#if displayActiveTasks.length > 0}
          <section>
            <div class="flex items-center gap-2 px-6 pb-2 md:px-8">
              <h2 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Active</h2>
              <span class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                {displayActiveTasks.length}
              </span>
            </div>
            {#if viewMode === 'grid'}
              <div class="grid gap-3 px-6 md:px-8 sm:grid-cols-2 lg:grid-cols-3">
                {#each displayActiveTasks as task (task.id)}
                  <CountdownCard {task} variant="grid" onOpen={(id) => goto(`/tasks/${id}`)} />
                {/each}
              </div>
            {:else}
              <div class="divide-y divide-border border-y border-border">
                {#each displayActiveTasks as task (task.id)}
                  <CountdownCard {task} variant="list" onOpen={(id) => goto(`/tasks/${id}`)} />
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        <!-- Completed tasks -->
        {#if displayCompletedTasks.length > 0}
          <section class="mt-8">
            <div class="flex items-center gap-2 px-6 pb-2 md:px-8">
              <h2 class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Completed</h2>
              <span class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                {displayCompletedTasks.length}
              </span>
            </div>
            {#if viewMode === 'grid'}
              <div class="grid gap-3 px-6 md:px-8 sm:grid-cols-2 lg:grid-cols-3">
                {#each displayCompletedTasks as task (task.id)}
                  <CountdownCard {task} variant="grid" onOpen={(id) => goto(`/tasks/${id}`)} />
                {/each}
              </div>
            {:else}
              <div class="divide-y divide-border border-y border-border">
                {#each displayCompletedTasks as task (task.id)}
                  <CountdownCard {task} variant="list" onOpen={(id) => goto(`/tasks/${id}`)} />
                {/each}
              </div>
            {/if}
          </section>
        {/if}

        <!-- Empty state -->
        {#if displayActiveTasks.length === 0 && displayCompletedTasks.length === 0 && tasks.length > 0}
          <div class="flex flex-col items-center gap-1 py-12 text-center">
            <p class="text-sm text-muted-foreground">No tasks match your search</p>
          </div>
        {/if}

        <div class="h-8"></div>
      </main>
    </div>

    <BottomNav />

    <CreateTaskDialog bind:open={dialogOpen} onCreated={loadTasks} />
  </div>
{/if}
