<script lang="ts">
  import { onDestroy } from 'svelte';
  import { toast } from 'svelte-sonner';
  import { Play, Square, RotateCcw, Timer } from 'lucide-svelte';
  import { startSession, stopSession, getPomodoroStats } from '$lib/api';
  import type { PomodoroStats } from '$lib/api';

  const RING_SIZE = 120;
  const STROKE_WIDTH = 6;
  const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  type TimerState = 'idle' | 'running' | 'complete';

  let {
    taskId,
    isCompleted,
    onSessionStop,
  }: {
    taskId: string;
    isCompleted: boolean;
    onSessionStop?: () => void;
  } = $props();

  const PRESETS = [25, 50] as const;

  let selectedMinutes = $state(25);
  let customInput = $state('');
  let showCustom = $state(false);
  let timerState = $state<TimerState>('idle');
  let totalSeconds = $state(25 * 60);
  let remaining = $state(25 * 60);
  let stats = $state<PomodoroStats | null>(null);
  let loading = $state(false);
  let intervalRef: ReturnType<typeof setInterval> | null = null;
  let hasCompleted = false;

  function padTwo(n: number): string {
    return n.toString().padStart(2, '0');
  }

  function formatDisplay(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${padTwo(m)}:${padTwo(s)}`;
  }

  function playBeep(): void {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
      oscillator.onended = () => ctx.close();
    } catch { /* ignore */ }
  }

  async function loadStats() {
    try {
      stats = await getPomodoroStats(taskId);
    } catch { /* ignore */ }
  }

  loadStats();

  onDestroy(() => {
    if (intervalRef) clearInterval(intervalRef);
  });

  function applyDuration(minutes: number) {
    const secs = minutes * 60;
    selectedMinutes = minutes;
    totalSeconds = secs;
    remaining = secs;
    timerState = 'idle';
    hasCompleted = false;
    if (intervalRef) { clearInterval(intervalRef); intervalRef = null; }
  }

  function handlePresetClick(minutes: number) {
    showCustom = false;
    customInput = '';
    applyDuration(minutes);
  }

  function handleCustomApply() {
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 180) {
      applyDuration(parsed);
      showCustom = false;
    } else {
      toast.error('Enter a duration between 1 and 180 minutes');
    }
  }

  async function handleStart() {
    loading = true;
    try {
      await startSession(taskId, 'pomodoro');
      hasCompleted = false;
      timerState = 'running';
      remaining = totalSeconds;

      intervalRef = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          remaining = 0;
          if (!hasCompleted) {
            hasCompleted = true;
            handleComplete();
          }
        }
      }, 1000);

      toast.success('Pomodoro started');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start session.');
    } finally {
      loading = false;
    }
  }

  async function handleComplete() {
    if (intervalRef) { clearInterval(intervalRef); intervalRef = null; }
    playBeep();
    timerState = 'complete';
    try {
      await stopSession(taskId);
      await loadStats();
      onSessionStop?.();
    } catch { /* ignore */ }
    toast.success('Pomodoro complete! Take a break.', { duration: 6000 });
  }

  async function handleStop() {
    if (intervalRef) { clearInterval(intervalRef); intervalRef = null; }
    loading = true;
    try {
      await stopSession(taskId);
      timerState = 'idle';
      remaining = totalSeconds;
      hasCompleted = false;
      onSessionStop?.();
      toast.success('Pomodoro stopped');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop session.');
    } finally {
      loading = false;
    }
  }

  function handleReset() {
    if (intervalRef) { clearInterval(intervalRef); intervalRef = null; }
    remaining = totalSeconds;
    timerState = 'running';
    hasCompleted = false;

    intervalRef = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        remaining = 0;
        if (!hasCompleted) {
          hasCompleted = true;
          handleComplete();
        }
      }
    }, 1000);
  }

  let progress = $derived(totalSeconds > 0 ? (totalSeconds - remaining) / totalSeconds : 0);
  let dashOffset = $derived(CIRCUMFERENCE * (1 - progress));
  let ringColor = $derived(
    timerState === 'complete' ? 'hsl(var(--success))' :
    timerState === 'running' ? 'hsl(var(--primary))' :
    'hsl(var(--muted-foreground))'
  );
</script>

<div class="space-y-5">
  <!-- Duration selector - only when idle -->
  {#if timerState === 'idle'}
    <div class="space-y-2">
      <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Duration</p>
      <div class="flex items-center gap-2">
        {#each PRESETS as min}
          <button
            onclick={() => handlePresetClick(min)}
            class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {selectedMinutes === min && !showCustom ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'}"
          >
            {min}m
          </button>
        {/each}
        <button
          onclick={() => showCustom = !showCustom}
          class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors {showCustom ? 'bg-foreground text-background' : 'bg-secondary text-muted-foreground hover:text-foreground'}"
        >
          Custom
        </button>
      </div>

      {#if showCustom}
        <div class="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={180}
            bind:value={customInput}
            onkeydown={(e) => e.key === 'Enter' && handleCustomApply()}
            placeholder="minutes"
            class="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onclick={handleCustomApply}
            class="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Set
          </button>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Timer ring -->
  <div class="flex items-center gap-6">
    <div class="relative flex items-center justify-center" style="width: {RING_SIZE}px; height: {RING_SIZE}px">
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox="0 0 {RING_SIZE} {RING_SIZE}"
        aria-hidden="true"
        style="transform: rotate(-90deg)"
      >
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="hsl(var(--border))"
          stroke-width={STROKE_WIDTH}
        />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke={ringColor}
          stroke-width={STROKE_WIDTH}
          stroke-linecap="round"
          stroke-dasharray={CIRCUMFERENCE}
          stroke-dashoffset={dashOffset}
          style="transition: {timerState === 'running' ? 'stroke-dashoffset 1s linear, stroke 0.3s ease' : 'stroke 0.3s ease'}"
        />
      </svg>

      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="font-mono text-lg font-bold countdown-digits tabular-nums leading-none {timerState === 'complete' ? 'text-success' : timerState === 'running' ? 'text-foreground' : 'text-muted-foreground'}">
          {formatDisplay(remaining)}
        </span>
        {#if timerState === 'complete'}
          <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-success">Done</span>
        {:else if timerState === 'running'}
          <span class="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Focus</span>
        {/if}
      </div>
    </div>

    <!-- Controls -->
    <div class="flex flex-col gap-2">
      {#if timerState === 'idle' && !isCompleted}
        <button
          onclick={handleStart}
          disabled={loading}
          aria-label="Start pomodoro"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95 {loading ? 'opacity-50' : ''}"
        >
          <Play class="h-4 w-4 ml-0.5" fill="currentColor" />
        </button>
      {/if}

      {#if timerState === 'running'}
        <button
          onclick={handleStop}
          disabled={loading}
          aria-label="Stop pomodoro"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-95 {loading ? 'opacity-50' : ''}"
        >
          <Square class="h-4 w-4" fill="currentColor" />
        </button>
        <button
          onclick={handleReset}
          disabled={loading}
          aria-label="Reset pomodoro"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all hover:text-foreground active:scale-95"
        >
          <RotateCcw class="h-4 w-4" />
        </button>
      {/if}

      {#if timerState === 'complete' && !isCompleted}
        <button
          onclick={() => applyDuration(selectedMinutes)}
          aria-label="Start new pomodoro"
          class="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95"
        >
          <RotateCcw class="h-4 w-4" />
        </button>
      {/if}
    </div>

    <!-- State label -->
    <div class="flex flex-col gap-1">
      {#if timerState === 'running'}
        <div class="flex items-center gap-1.5 text-[11px] text-primary">
          <div class="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></div>
          Recording
        </div>
      {:else if timerState === 'complete'}
        <div class="space-y-1">
          <p class="text-[11px] font-semibold text-success">Complete</p>
          <p class="text-[11px] text-muted-foreground">Take a 5m break</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Stats -->
  {#if stats}
    <div class="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
      <div class="flex items-center gap-1.5">
        <Timer class="h-3.5 w-3.5" />
        <span class="font-mono countdown-digits tabular-nums">{stats.total_pomodoros}</span>
        <span class="text-[11px]">pomodoros</span>
      </div>
      <span class="text-muted-foreground/40">|</span>
      <div class="flex items-center gap-1.5">
        <span class="font-mono countdown-digits tabular-nums">{stats.total_minutes}</span>
        <span class="text-[11px]">focus mins</span>
      </div>
    </div>
  {/if}
</div>
