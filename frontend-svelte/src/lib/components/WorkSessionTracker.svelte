<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Play, Square, Clock } from 'lucide-svelte';
  import { startSession, stopSession, getActiveSession, getTaskSessions } from '$lib/api';
  import type { WorkSession } from '$lib/types/task';
  import PomodoroTimer from './PomodoroTimer.svelte';

  let {
    taskId,
    isCompleted,
  }: {
    taskId: string;
    isCompleted: boolean;
  } = $props();

  type TrackerMode = 'manual' | 'pomodoro';

  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
    return `${pad(m)}m ${pad(s)}s`;
  }

  let mode = $state<TrackerMode>('manual');
  let activeSession = $state<WorkSession | null>(null);
  let sessions = $state<WorkSession[]>([]);
  let elapsed = $state(0);
  let loading = $state(false);
  let intervalRef: ReturnType<typeof setInterval> | null = null;

  async function loadSessions() {
    try {
      const [active, history] = await Promise.all([
        getActiveSession(),
        getTaskSessions(taskId),
      ]);
      if (active && active.task_id === taskId) {
        activeSession = active;
      }
      sessions = history;
    } catch { /* API not available */ }
  }

  onMount(() => {
    loadSessions();
  });

  $effect(() => {
    if (intervalRef) { clearInterval(intervalRef); intervalRef = null; }
    if (!activeSession) {
      elapsed = 0;
      return;
    }
    const start = new Date(activeSession.started_at).getTime();
    const tick = () => elapsed = Math.floor((Date.now() - start) / 1000);
    tick();
    intervalRef = setInterval(tick, 1000);
  });

  onDestroy(() => {
    if (intervalRef) clearInterval(intervalRef);
  });

  async function handleStart() {
    loading = true;
    try {
      const ws = await startSession(taskId);
      activeSession = ws;
      toast.success('Session started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start session.');
    } finally {
      loading = false;
    }
  }

  async function handleStop() {
    loading = true;
    try {
      await stopSession(taskId);
      activeSession = null;
      await loadSessions();
      toast.success('Session stopped');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop session.');
    } finally {
      loading = false;
    }
  }

  let totalSeconds = $derived(
    sessions
      .filter(s => s.duration_seconds != null)
      .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  );

  let isActive = $derived(activeSession !== null);
</script>

<div class="space-y-4">
  <!-- Mode toggle -->
  <div class="flex items-center gap-0.5 rounded-md border border-border bg-secondary/30 p-0.5 w-fit">
    {#each (['manual', 'pomodoro'] as TrackerMode[]) as m}
      <button
        onclick={() => mode = m}
        class="rounded px-3 py-1 text-[11px] font-semibold uppercase tracking-widest transition-colors {mode === m ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'}"
      >
        {m}
      </button>
    {/each}
  </div>

  {#if mode === 'pomodoro'}
    <PomodoroTimer {taskId} {isCompleted} onSessionStop={loadSessions} />
  {:else}
    <!-- Manual timer display -->
    <div class="rounded-lg border border-border bg-secondary/30 p-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {isActive ? 'Working' : 'Session'}
          </p>
          <p class="mt-1 font-mono text-3xl font-bold countdown-digits {isActive ? 'text-success' : 'text-foreground'}">
            {isActive ? formatDuration(elapsed) : '00m 00s'}
          </p>
        </div>

        {#if !isCompleted}
          <button
            onclick={isActive ? handleStop : handleStart}
            disabled={loading}
            class="flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 {isActive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : 'bg-foreground text-background hover:bg-foreground/90'} {loading ? 'opacity-50' : ''}"
          >
            {#if isActive}
              <Square class="h-5 w-5" fill="currentColor" />
            {:else}
              <Play class="h-5 w-5 ml-0.5" fill="currentColor" />
            {/if}
          </button>
        {/if}
      </div>

      {#if isActive}
        <div class="mt-3 flex items-center gap-1.5 text-[11px] text-success">
          <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-success"></div>
          Recording work session
        </div>
      {/if}
    </div>

    <!-- Session stats -->
    <div class="flex items-center gap-4 text-sm">
      <div class="flex items-center gap-1.5 text-muted-foreground">
        <Clock class="h-3.5 w-3.5" />
        <span class="font-mono countdown-digits">{formatDuration(totalSeconds + (isActive ? elapsed : 0))}</span>
        <span class="text-[11px]">total</span>
      </div>
      <span class="text-muted-foreground/50">|</span>
      <span class="text-[11px] text-muted-foreground">
        {sessions.filter(s => s.duration_seconds != null).length} sessions
      </span>
    </div>
  {/if}

  <!-- Session history - shared -->
  {#if sessions.length > 0}
    <div class="space-y-1">
      <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">History</p>
      <div class="space-y-0.5">
        {#each sessions.slice(0, 5) as s}
          <div class="flex items-center justify-between rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50">
            <div class="flex items-center gap-2">
              <span>
                {new Date(s.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                {' '}
                {new Date(s.started_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              {#if s.session_type === 'pomodoro'}
                <span class="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
                  pomo
                </span>
              {/if}
            </div>
            <span class="font-mono countdown-digits">
              {s.duration_seconds != null ? formatDuration(s.duration_seconds) : 'in progress'}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
