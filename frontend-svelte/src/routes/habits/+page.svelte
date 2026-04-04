<script lang="ts">
  import { goto } from '$app/navigation';
  import { Zap, Plus, Flame, Check, Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-svelte';
  import { toast } from 'svelte-sonner';
  import { user, isLoading, refreshUser } from '$lib/auth';
  import { getHabits, createHabit, deleteHabit, checkInHabit, getHabitHistory, checkMissedHabits } from '$lib/api';
  import type { Habit, HabitHistoryEntry } from '$lib/types/task';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  const PRESET_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#a16207',
  ];

  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  interface WeekColumn {
    weekIndex: number;
    days: (Date | null)[];
  }

  function buildYearGrid(year: number): WeekColumn[] {
    const jan1 = new Date(year, 0, 1);
    const dec31 = new Date(year, 11, 31);
    const weeks: WeekColumn[] = [];
    const cur = new Date(jan1);
    let weekIndex = 0;

    const firstDayOfWeek = jan1.getDay();
    const firstWeek: (Date | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) firstWeek.push(null);
    while (firstWeek.length < 7 && cur <= dec31) {
      firstWeek.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push({ weekIndex, days: firstWeek });
    weekIndex++;

    while (cur <= dec31) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7 && cur <= dec31; i++) {
        week.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      while (week.length < 7) week.push(null);
      weeks.push({ weekIndex, days: week });
      weekIndex++;
    }
    return weeks;
  }

  function dateToKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function computeStreak(history: HabitHistoryEntry[]): number {
    const completed = new Set(history.filter(h => h.completed).map(h => h.date));
    const today = new Date();
    let streak = 0;
    const cur = new Date(today);
    if (!completed.has(dateToKey(cur))) cur.setDate(cur.getDate() - 1);
    while (true) {
      const key = dateToKey(cur);
      if (completed.has(key)) { streak++; cur.setDate(cur.getDate() - 1); }
      else break;
    }
    return streak;
  }

  // Page state
  let habits = $state<Habit[]>([]);
  let checkedToday = $state<Set<string>>(new Set());
  let streaks = $state<Record<string, number>>({});
  let fetching = $state(true);
  let dialogOpen = $state(false);

  // Create habit dialog state
  let newName = $state('');
  let newColor = $state(PRESET_COLORS[4]);
  let newCadence = $state<'daily' | 'weekly' | 'monthly'>('daily');
  let newReward = $state('1');
  let creating = $state(false);

  let balance = $derived($user?.currency_balance ?? 0);
  let displayName = $derived($user?.display_name ?? 'there');

  $effect(() => {
    if (!$isLoading && !$user) {
      goto('/login', { replaceState: true });
    }
  });

  $effect(() => {
    const loading = $isLoading;
    const u = $user;
    if (!loading && u) {
      loadHabits();
    }
  });

  async function loadHabits() {
    try {
      const data = await getHabits();
      habits = data;
      const today = getTodayString();
      const checked = new Set<string>();
      const streakMap: Record<string, number> = {};
      for (const habit of data) {
        try {
          const history = await getHabitHistory(habit.id, new Date().getFullYear());
          if (history.some(e => e.date === today && e.completed)) checked.add(habit.id);
          streakMap[habit.id] = computeStreak(history);
        } catch { /* ignore */ }
      }
      checkedToday = checked;
      streaks = streakMap;

      try {
        const missed = await checkMissedHabits();
        if (missed.total_penalty > 0) {
          for (const d of missed.details) {
            toast.warning(`Missed ${d.missed_days} day(s) of ${d.habit}. -${d.penalty} rupees`);
          }
          refreshUser();
        }
      } catch { /* ignore */ }
    } catch {
      toast.error('Could not load habits.');
    } finally {
      fetching = false;
    }
  }

  async function handleCheckIn(id: string) {
    const isChecked = checkedToday.has(id);
    if (isChecked) {
      if (!window.confirm("Undo today's check-in? You'll lose the rupees earned.")) return;
    }
    try {
      await checkInHabit(id);
      const habit = habits.find(h => h.id === id);
      if (isChecked) {
        const next = new Set(checkedToday);
        next.delete(id);
        checkedToday = next;
        toast('Check-in undone', { description: habit?.name });
      } else {
        checkedToday = new Set([...checkedToday, id]);
        toast.success(`Checked in · ${habit?.name ?? ''}! +${habit?.reward_amount ?? 1} rupee`);
      }
      if (expanded[id]) {
        fetchHistory(id);
      } else {
        try {
          const history = await getHabitHistory(id, new Date().getFullYear());
          streaks = { ...streaks, [id]: computeStreak(history) };
        } catch { /* ignore */ }
      }
      refreshUser();
    } catch {
      toast.error('Check-in failed. Try again.');
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHabit(id);
      habits = habits.filter(h => h.id !== id);
      toast.success('Habit deleted.');
    } catch {
      toast.error('Could not delete habit.');
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    creating = true;
    try {
      const habit = await createHabit({
        name: newName.trim(),
        color: newColor,
        cadence: newCadence,
        reward_amount: parseFloat(newReward) || 1,
      });
      habits = [habit, ...habits];
      dialogOpen = false;
      newName = '';
      newColor = PRESET_COLORS[4];
      newCadence = 'daily';
      newReward = '1';
    } catch {
      toast.error('Failed to create habit.');
    } finally {
      creating = false;
    }
  }

  // Per-habit expanded/history state
  let expanded = $state<Record<string, boolean>>({});
  let habitHistory = $state<Record<string, HabitHistoryEntry[]>>({});
  let loadingHistory = $state<Record<string, boolean>>({});

  async function fetchHistory(habitId: string) {
    loadingHistory = { ...loadingHistory, [habitId]: true };
    try {
      const data = await getHabitHistory(habitId, new Date().getFullYear());
      habitHistory = { ...habitHistory, [habitId]: data };
      streaks = { ...streaks, [habitId]: computeStreak(data) };
    } catch {
      habitHistory = { ...habitHistory, [habitId]: [] };
    } finally {
      loadingHistory = { ...loadingHistory, [habitId]: false };
    }
  }

  function toggleExpand(habitId: string) {
    const next = !expanded[habitId];
    expanded = { ...expanded, [habitId]: next };
    if (next) fetchHistory(habitId);
  }

  const cadenceBadgeColor: Record<string, string> = {
    daily: 'bg-blue-500/10 text-blue-400',
    weekly: 'bg-violet-500/10 text-violet-400',
    monthly: 'bg-amber-500/10 text-amber-400',
  };
</script>

{#if $isLoading}
  <div class="flex h-screen items-center justify-center">
    <p class="text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</p>
  </div>
{:else}
  <div class="flex h-screen overflow-hidden">
    <Sidebar />

    <div class="flex flex-1 flex-col overflow-hidden">
      <TopBar currencyBalance={balance} userName={displayName} />

      <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
        <!-- Header -->
        <div class="flex items-end justify-between px-6 pt-8 pb-6 md:px-8">
          <div>
            <div class="flex items-center gap-2">
              <Zap class="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <p class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Habits</p>
            </div>
            <h1 class="mt-1 font-heading text-xl font-semibold tracking-tight">Habit Tracker</h1>
            <p class="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button
            onclick={() => dialogOpen = true}
            class="flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-all hover:opacity-90"
          >
            <Plus class="h-3.5 w-3.5" strokeWidth={2.5} />
            New Habit
          </button>
        </div>

        <!-- Habit list -->
        <div class="px-6 md:px-8">
          {#if fetching}
            <div class="space-y-2">
              {#each [1, 2, 3] as i}
                <div class="h-14 animate-pulse rounded-lg bg-secondary"></div>
              {/each}
            </div>
          {:else if habits.length === 0}
            <div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
              <Calendar class="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1} />
              <p class="text-sm font-medium">No habits yet</p>
              <p class="mt-1 text-[12px] text-muted-foreground">Create your first habit to start tracking.</p>
            </div>
          {:else}
            <div class="flex flex-col gap-2">
              {#each habits as habit (habit.id)}
                <div class="rounded-lg border border-border bg-background transition-colors">
                  <div class="flex items-center gap-3 px-4 py-3">
                    <!-- Color dot -->
                    <div class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: {habit.color}"></div>

                    <!-- Name -->
                    <span class="flex-1 text-sm font-medium">{habit.name}</span>

                    <!-- Cadence badge -->
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider {cadenceBadgeColor[habit.cadence] ?? ''}">
                      {habit.cadence}
                    </span>

                    <!-- Streak -->
                    <div class="flex items-center gap-1 text-muted-foreground">
                      <Flame class="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
                      <span class="font-mono text-xs countdown-digits">{streaks[habit.id] ?? 0}</span>
                    </div>

                    <!-- Check-in button -->
                    <button
                      onclick={() => handleCheckIn(habit.id)}
                      class="flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all {checkedToday.has(habit.id) ? 'border-transparent text-white' : 'border-border text-transparent hover:border-muted-foreground'}"
                      style={checkedToday.has(habit.id) ? `background-color: ${habit.color}; border-color: ${habit.color}` : ''}
                      title={checkedToday.has(habit.id) ? 'Checked in' : 'Check in'}
                      aria-label={checkedToday.has(habit.id) ? 'Checked in today' : 'Check in for today'}
                    >
                      <Check class="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>

                    <!-- Expand toggle -->
                    <button
                      onclick={() => toggleExpand(habit.id)}
                      class="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                      aria-label={expanded[habit.id] ? 'Collapse' : 'Expand year view'}
                    >
                      {#if expanded[habit.id]}
                        <ChevronUp class="h-4 w-4" strokeWidth={1.5} />
                      {:else}
                        <ChevronDown class="h-4 w-4" strokeWidth={1.5} />
                      {/if}
                    </button>

                    <!-- Delete -->
                    <button
                      onclick={() => handleDelete(habit.id)}
                      class="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Delete habit"
                    >
                      <Trash2 class="h-3.5 w-3.5" strokeWidth={1.5} />
                    </button>
                  </div>

                  <!-- Expanded: dot grid -->
                  {#if expanded[habit.id]}
                    <div class="overflow-x-auto border-t border-border px-4 pb-4">
                      {#if loadingHistory[habit.id]}
                        <div class="py-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</div>
                      {:else if habitHistory[habit.id]}
                        {@const year = new Date().getFullYear()}
                        {@const weeks = buildYearGrid(year)}
                        {@const completedSet = new Set(habitHistory[habit.id].filter(h => h.completed).map(h => h.date))}
                        {@const totalCompletions = habitHistory[habit.id].filter(h => h.completed).length}
                        {@const streak = computeStreak(habitHistory[habit.id])}
                        {@const today = getTodayString()}
                        {@const totalWeeks = weeks.length}

                        <!-- Month labels -->
                        {@const monthPositions = (() => {
                          const positions: { col: number; month: number }[] = [];
                          const seenMonths = new Set<number>();
                          for (let w = 0; w < weeks.length; w++) {
                            for (const day of weeks[w].days) {
                              if (day && day.getFullYear() === year && !seenMonths.has(day.getMonth())) {
                                seenMonths.add(day.getMonth());
                                positions.push({ col: w, month: day.getMonth() });
                                break;
                              }
                            }
                          }
                          return positions;
                        })()}
                        <div class="mt-4 w-full">
                          <div class="mb-1" style="display: grid; grid-template-columns: repeat({totalWeeks}, 1fr); gap: 2px;">
                            {#each Array.from({ length: totalWeeks }, (_, col) => col) as col}
                              {@const mp = monthPositions.find(m => m.col === col)}
                              <div class="text-[9px] font-medium text-muted-foreground overflow-hidden">
                                {mp ? MONTH_LABELS[mp.month] : ''}
                              </div>
                            {/each}
                          </div>

                          <!-- Dot grid -->
                          <div style="display: grid; grid-template-columns: repeat({totalWeeks}, 1fr); grid-template-rows: repeat(7, 1fr); gap: 2px; aspect-ratio: {totalWeeks} / 7;">
                            {#each weeks as week}
                              {#each week.days as day, dayIdx}
                                {#if !day}
                                  <div style="grid-column: {week.weekIndex + 1}; grid-row: {dayIdx + 1};"></div>
                                {:else}
                                  {@const key = dateToKey(day)}
                                  {@const done = completedSet.has(key)}
                                  {@const isToday = key === today}
                                  {@const isPast = key < today}
                                  {@const canBackfill = isPast && !done}
                                  {#if canBackfill}
                                    <button
                                      title="{key} (click to backfill)"
                                      onclick={async () => {
                                        const cost = habit.reward_amount;
                                        if (!window.confirm(`Mark ${key} as done?\n\nThis costs ${cost} rupee${cost !== 1 ? 's' : ''} as a late penalty.`)) return;
                                        try {
                                          await checkInHabit(habit.id, key);
                                          toast.success(`Backfilled ${key} · -${cost} rupee${cost !== 1 ? 's' : ''}`);
                                          fetchHistory(habit.id);
                                        } catch (err) {
                                          toast.error(err instanceof Error ? err.message : 'Backfill failed.');
                                        }
                                      }}
                                      style="grid-column: {week.weekIndex + 1}; grid-row: {dayIdx + 1}; border-radius: 2px; background-color: {habit.color}1a; {isToday ? `outline: 2px solid ${habit.color}; outline-offset: 1px;` : ''} cursor: pointer; border: none; padding: 0;"
                                    ></button>
                                  {:else}
                                    <div
                                      title="{key}{done ? ' (done)' : ''}"
                                      style="grid-column: {week.weekIndex + 1}; grid-row: {dayIdx + 1}; border-radius: 2px; background-color: {done ? habit.color : habit.color + '1a'}; {isToday ? `outline: 2px solid ${habit.color}; outline-offset: 1px;` : ''}"
                                    ></div>
                                  {/if}
                                {/if}
                              {/each}
                            {/each}
                          </div>

                          <!-- Stats below grid -->
                          <div class="mt-3 flex items-center gap-5">
                            <div class="flex items-center gap-1.5">
                              <Flame class="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
                              <span class="font-mono text-sm font-bold countdown-digits">{streak}</span>
                              <span class="text-[11px] uppercase tracking-widest text-muted-foreground">streak</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                              <Check class="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
                              <span class="font-mono text-sm font-bold countdown-digits">{totalCompletions}</span>
                              <span class="text-[11px] uppercase tracking-widest text-muted-foreground">total</span>
                            </div>
                          </div>
                        </div>
                      {/if}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>

        <div class="h-8"></div>
      </main>
    </div>

    <BottomNav />
  </div>

  <!-- Create habit dialog -->
  {#if dialogOpen}
    <div
      class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      role="button"
      tabindex="-1"
      onclick={() => dialogOpen = false}
      onkeydown={(e) => e.key === 'Escape' && (dialogOpen = false)}
    ></div>
    <div
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 shadow-2xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="habit-dialog-title"
    >
      <h2 id="habit-dialog-title" class="font-heading text-base font-semibold mb-4">New Habit</h2>

      <div class="flex flex-col gap-4">
        <!-- Name -->
        <div class="flex flex-col gap-1.5">
          <label for="habit-name" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Name</label>
          <input
            id="habit-name"
            type="text"
            placeholder="e.g. Morning run"
            bind:value={newName}
            onkeydown={(e) => e.key === 'Enter' && handleCreate()}
            autofocus
            class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
          />
        </div>

        <!-- Color -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Color</span>
          <div class="flex flex-wrap gap-2">
            {#each PRESET_COLORS as c}
              <button
                type="button"
                onclick={() => newColor = c}
                class="relative h-6 w-6 rounded-full transition-transform hover:scale-110"
                style="background-color: {c}; {newColor === c ? `outline: 2px solid ${c}; outline-offset: 2px;` : ''}"
                aria-label="Select color {c}"
              >
                {#if newColor === c}
                  <span class="absolute inset-0 flex items-center justify-center">
                    <Check class="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </span>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Cadence -->
        <div class="flex flex-col gap-1.5">
          <label for="habit-cadence" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Cadence</label>
          <select
            id="habit-cadence"
            bind:value={newCadence}
            class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <!-- Reward -->
        <div class="flex flex-col gap-1.5">
          <label for="habit-reward" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Reward (rupees)</label>
          <input
            id="habit-reward"
            type="number"
            min="0"
            step="0.5"
            bind:value={newReward}
            class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
          />
        </div>
      </div>

      <div class="mt-4 flex justify-end">
        <button
          onclick={handleCreate}
          disabled={!newName.trim() || creating}
          class="flex h-8 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creating ? 'Creating…' : 'Create Habit'}
        </button>
      </div>
    </div>
  {/if}
{/if}
