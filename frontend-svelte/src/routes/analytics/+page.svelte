<script lang="ts">
  import { goto } from '$app/navigation';
  import { BarChart3, Clock, CheckCircle2, Circle, AlertCircle, Flame, Tag } from 'lucide-svelte';
  import { user, isLoading } from '$lib/auth';
  import { getAnalyticsSummary, getDailyAnalytics, getWeeklyAnalytics, getTagAnalytics, getHabitAnalytics } from '$lib/api';
  import type { AnalyticsSummary, DailyAnalytics, WeeklyAnalytics, TagAnalytics, HabitAnalytics } from '$lib/api';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';

  let summary = $state<AnalyticsSummary | null>(null);
  let daily = $state<DailyAnalytics[]>([]);
  let weekly = $state<WeeklyAnalytics[]>([]);
  let tagAnalytics = $state<TagAnalytics[]>([]);
  let habitAnalytics = $state<HabitAnalytics[]>([]);
  let error = $state(false);

  let balance = $derived($user?.currency_balance ?? 0);
  let displayName = $derived($user?.display_name ?? 'there');

  function formatISOWeek(isoWeek: string): string {
    const match = isoWeek.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return isoWeek;
    const year = parseInt(match[1], 10);
    const week = parseInt(match[2], 10);
    const jan4 = new Date(year, 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
    return monday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  }

  function formatMinutes(mins: number | null | undefined): string {
    const total = Math.max(0, Math.floor(mins ?? 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  $effect(() => {
    if (!$isLoading && !$user) {
      goto('/login', { replaceState: true });
    }
  });

  $effect(() => {
    const loading = $isLoading;
    const u = $user;
    if (!loading && u) {
      Promise.all([
        getAnalyticsSummary(),
        getDailyAnalytics(),
        getWeeklyAnalytics().catch(() => [] as WeeklyAnalytics[]),
        getTagAnalytics().catch(() => [] as TagAnalytics[]),
        getHabitAnalytics().catch(() => [] as HabitAnalytics[]),
      ])
        .then(([s, d, w, t, h]) => {
          summary = s;
          daily = d;
          weekly = w;
          tagAnalytics = t;
          habitAnalytics = h;
        })
        .catch(() => error = true);
    }
  });
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
        <div class="px-6 pt-8 pb-6 md:px-8">
          <div class="flex items-center gap-2">
            <BarChart3 class="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            <p class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Analytics</p>
          </div>
          <h1 class="mt-1 font-heading text-xl font-semibold tracking-tight">Overview</h1>
        </div>

        {#if error}
          <div class="mx-6 mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 md:mx-8">
            <p class="text-[12px] text-destructive">Could not load analytics data.</p>
          </div>
        {/if}

        {#if summary}
          <!-- Task counts -->
          <section class="px-6 md:px-8">
            <p class="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Tasks</p>
            <div class="grid grid-cols-2 gap-px rounded-lg border border-border bg-border sm:grid-cols-4">
              <div class="flex flex-col gap-2 rounded-tl-lg bg-background px-5 py-4">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Circle class="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span class="text-[11px] uppercase tracking-widest font-semibold">Total</span>
                </div>
                <p class="font-mono text-3xl font-bold countdown-digits">{summary.total_tasks}</p>
              </div>
              <div class="flex flex-col gap-2 bg-background px-5 py-4 sm:rounded-none">
                <div class="flex items-center gap-1.5 text-success">
                  <CheckCircle2 class="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span class="text-[11px] uppercase tracking-widest font-semibold">Done</span>
                </div>
                <p class="font-mono text-3xl font-bold countdown-digits text-success">{summary.completed_tasks}</p>
              </div>
              <div class="flex flex-col gap-2 bg-background px-5 py-4 rounded-bl-lg sm:rounded-none">
                <div class="flex items-center gap-1.5 text-muted-foreground">
                  <Circle class="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span class="text-[11px] uppercase tracking-widest font-semibold">Active</span>
                </div>
                <p class="font-mono text-3xl font-bold countdown-digits">{summary.active_tasks}</p>
              </div>
              <div class="flex flex-col gap-2 rounded-br-lg bg-background px-5 py-4">
                <div class="flex items-center gap-1.5 text-destructive">
                  <AlertCircle class="h-3.5 w-3.5" strokeWidth={1.5} />
                  <span class="text-[11px] uppercase tracking-widest font-semibold">Overdue</span>
                </div>
                <p class="font-mono text-3xl font-bold countdown-digits text-destructive">{summary.overdue_tasks}</p>
              </div>
            </div>
          </section>

          <div class="h-px bg-border my-6 mx-6 md:mx-8"></div>

          <!-- Finance & Time -->
          <section class="px-6 md:px-8">
            <p class="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Finance & Time</p>
            <div class="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <div class="flex flex-col gap-0.5">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Balance</p>
                <p class="font-mono text-2xl font-bold countdown-digits text-chart-2">Z {summary.current_balance}</p>
              </div>
              <div class="flex flex-col gap-0.5">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Earned</p>
                <p class="font-mono text-2xl font-bold countdown-digits text-success">+{summary.currency_earned}</p>
                <p class="text-[11px] text-muted-foreground">rupees</p>
              </div>
              <div class="flex flex-col gap-0.5">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Lost</p>
                <p class="font-mono text-2xl font-bold countdown-digits text-destructive">-{summary.currency_lost}</p>
                <p class="text-[11px] text-muted-foreground">rupees</p>
              </div>
              <div class="flex flex-col gap-0.5">
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Hours worked</p>
                <p class="font-mono text-2xl font-bold countdown-digits">{summary.total_hours_worked.toFixed(1)}</p>
                <p class="text-[11px] text-muted-foreground">hours total</p>
              </div>
            </div>
          </section>

          {#if daily.length > 0}
            <div class="h-px bg-border my-6 mx-6 md:mx-8"></div>
            <section class="px-6 md:px-8">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Daily breakdown</p>
              <div class="divide-y divide-border rounded-lg border border-border">
                {#each daily as day}
                  <div class="flex items-center justify-between px-4 py-3">
                    <div>
                      <p class="text-sm font-medium">
                        {new Date(day.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p class="text-[11px] text-muted-foreground">
                        {day.sessions_count} session{day.sessions_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div class="flex items-center gap-1.5 text-muted-foreground">
                      <Clock class="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span class="font-mono text-sm countdown-digits">{formatMinutes(day.total_minutes)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}

          {#if weekly.length > 0}
            <div class="h-px bg-border my-6 mx-6 md:mx-8"></div>
            <section class="px-6 md:px-8">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Weekly breakdown</p>
              <div class="divide-y divide-border rounded-lg border border-border">
                {#each weekly as w}
                  <div class="flex items-center justify-between px-4 py-3">
                    <div>
                      <p class="text-sm font-medium">Week of {formatISOWeek(w.week)}</p>
                      <p class="text-[11px] text-muted-foreground">
                        {w.sessions_count} session{w.sessions_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div class="flex items-center gap-1.5 text-muted-foreground">
                      <Clock class="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span class="font-mono text-sm countdown-digits">{formatMinutes(w.total_minutes)}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}

          {#if tagAnalytics.length > 0}
            <div class="h-px bg-border my-6 mx-6 md:mx-8"></div>
            <section class="px-6 md:px-8">
              <div class="mb-3 flex items-center gap-2">
                <Tag class="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">By tag</p>
              </div>
              <div class="divide-y divide-border rounded-lg border border-border">
                {#each tagAnalytics as t}
                  <div class="flex items-center gap-3 px-4 py-3">
                    <div class="h-2 w-2 shrink-0 rounded-full" style="background-color: {t.tag_color}"></div>
                    <span class="flex-1 text-sm font-medium">{t.tag_name}</span>
                    <div class="flex items-center gap-4 text-right">
                      <div>
                        <p class="font-mono text-sm countdown-digits">{t.completed_count}/{t.task_count}</p>
                        <p class="text-[10px] uppercase tracking-wide text-muted-foreground">done</p>
                      </div>
                      <div>
                        <p class="font-mono text-sm countdown-digits">{formatMinutes(t.total_minutes)}</p>
                        <p class="text-[10px] uppercase tracking-wide text-muted-foreground">time</p>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}

          {#if habitAnalytics.length > 0}
            <div class="h-px bg-border my-6 mx-6 md:mx-8"></div>
            <section class="px-6 md:px-8">
              <p class="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Habits</p>
              <div class="divide-y divide-border rounded-lg border border-border">
                {#each habitAnalytics as h}
                  <div class="flex items-center gap-3 px-4 py-3">
                    <div class="h-2 w-2 shrink-0 rounded-full" style="background-color: {h.habit_color}"></div>
                    <div class="flex-1">
                      <p class="text-sm font-medium">{h.habit_name}</p>
                      <p class="text-[10px] uppercase tracking-wide text-muted-foreground">{h.cadence}</p>
                    </div>
                    <div class="flex items-center gap-4 text-right">
                      <div class="flex items-center gap-1">
                        <Flame class="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
                        <span class="font-mono text-sm countdown-digits">{h.current_streak}</span>
                      </div>
                      <div>
                        <p class="font-mono text-sm countdown-digits">{Math.round(h.completion_rate)}%</p>
                        <p class="text-[10px] uppercase tracking-wide text-muted-foreground">rate</p>
                      </div>
                      <div>
                        <p class="font-mono text-sm countdown-digits">{h.total_completions}</p>
                        <p class="text-[10px] uppercase tracking-wide text-muted-foreground">check-ins</p>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </section>
          {/if}
        {/if}

        {#if !summary && !error}
          <div class="px-6 space-y-4 md:px-8">
            <div class="h-32 rounded-lg bg-secondary animate-pulse"></div>
            <div class="h-24 rounded-lg bg-secondary animate-pulse"></div>
            <div class="h-48 rounded-lg bg-secondary animate-pulse"></div>
          </div>
        {/if}

        <div class="h-8"></div>
      </main>
    </div>

    <BottomNav />
  </div>
{/if}
