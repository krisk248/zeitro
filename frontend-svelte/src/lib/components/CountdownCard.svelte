<script lang="ts">
  import { Circle, Check, Clock, Coins, Flame } from 'lucide-svelte';
  import { calculateTimeRemaining, formatCountdown } from '$lib/countdown';
  import type { Task } from '$lib/types/task';
  import type { TimeRemaining } from '$lib/countdown';

  let {
    task,
    variant = 'list',
    onOpen,
  }: {
    task: Task;
    variant?: 'list' | 'grid';
    onOpen?: (taskId: string) => void;
  } = $props();

  let time = $state(calculateTimeRemaining(task.deadline));

  $effect(() => {
    if (task.status === 'completed' || task.status === 'cancelled') return;
    const interval = setInterval(() => {
      time = calculateTimeRemaining(task.deadline);
    }, 1000);
    return () => clearInterval(interval);
  });

  let countdown = $derived(formatCountdown(time));

  function getCountdownStyle(): string {
    if (task.status === 'completed') return 'text-muted-foreground line-through decoration-success/50';
    if (time.is_overdue) return 'text-destructive';
    if (time.total_seconds < 3600) return 'text-warning';
    if (time.total_seconds < 86400) return 'text-chart-2';
    return 'text-foreground';
  }

  function getRowAccent(): string {
    if (task.status === 'completed') return 'opacity-50';
    if (time.is_overdue) return 'border-l-2 border-l-destructive';
    if (time.total_seconds < 3600) return 'border-l-2 border-l-warning';
    return '';
  }

  function getCardBorder(): string {
    if (task.status === 'completed') return 'border-success/20 opacity-60';
    if (time.is_overdue) return 'border-destructive/30';
    if (time.total_seconds < 3600) return 'border-warning/30';
    if (time.total_seconds < 86400) return 'border-chart-2/20';
    return 'border-border';
  }

  function getPriorityClass(): string {
    if (task.priority === 'urgent') return 'bg-destructive/10 text-destructive';
    if (task.priority === 'high') return 'bg-warning/10 text-warning';
    return 'bg-secondary text-muted-foreground';
  }
</script>

{#if variant === 'grid'}
  <button
    onclick={() => onOpen?.(task.id)}
    class="group flex flex-col rounded-lg border p-4 text-left transition-all hover:bg-secondary/30 hover:scale-[1.01] {getCardBorder()}"
  >
    <!-- Top row: status + priority -->
    <div class="flex items-center justify-between mb-3">
      <div class="flex h-5 w-5 items-center justify-center">
        {#if task.status === 'completed'}
          <Check class="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
        {:else if task.status === 'paused'}
          <Circle class="h-3 w-3 text-muted-foreground" />
        {:else if time.is_overdue}
          <Flame class="h-3.5 w-3.5 text-destructive animate-pulse" />
        {:else if time.total_seconds < 3600}
          <Clock class="h-3.5 w-3.5 text-warning animate-pulse" />
        {:else}
          <div class="h-2 w-2 rounded-full bg-chart-1"></div>
        {/if}
      </div>
      <span class="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider {getPriorityClass()}">
        {task.priority}
      </span>
    </div>

    <!-- Title -->
    <h3 class="text-sm font-medium leading-snug mb-2 line-clamp-2 {task.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}">
      {task.title}
    </h3>

    <!-- Countdown - prominent -->
    <div class="font-mono text-xl font-bold countdown-digits mb-3 {getCountdownStyle()}">
      {task.status === 'completed' ? 'done' : countdown}
    </div>

    <!-- Tags -->
    {#if task.tags.length > 0}
      <div class="flex flex-wrap gap-1 mb-3">
        {#each task.tags as tag}
          <span
            class="rounded px-1.5 py-0.5 text-[10px] font-medium"
            style="background-color: {tag.color}15; color: {tag.color}"
          >
            {tag.name}
          </span>
        {/each}
      </div>
    {/if}

    <!-- Bottom: deadline + reward -->
    <div class="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
      <span>
        {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
      </span>
      <span class="flex items-center gap-0.5">
        <Coins class="h-3 w-3" />
        {task.reward_amount}
      </span>
    </div>
  </button>
{:else}
  <!-- List variant -->
  <button
    onclick={() => onOpen?.(task.id)}
    class="group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 {getRowAccent()}"
  >
    <div class="flex h-5 w-5 shrink-0 items-center justify-center">
      {#if task.status === 'completed'}
        <Check class="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
      {:else if task.status === 'paused'}
        <Circle class="h-3 w-3 text-muted-foreground" />
      {:else if time.is_overdue}
        <Flame class="h-3.5 w-3.5 text-destructive animate-pulse" />
      {:else if time.total_seconds < 3600}
        <Clock class="h-3.5 w-3.5 text-warning animate-pulse" />
      {:else}
        <div class="h-2 w-2 rounded-full bg-chart-1"></div>
      {/if}
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-center gap-2">
        <span class="truncate text-[13px] font-medium {task.status === 'completed' ? 'text-muted-foreground' : 'text-foreground'}">
          {task.title}
        </span>
        {#each task.tags as tag}
          <span
            class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
            style="background-color: {tag.color}15; color: {tag.color}"
          >
            {tag.name}
          </span>
        {/each}
      </div>
      <div class="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          {new Date(task.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </span>
        <span class="flex items-center gap-0.5">
          <Coins class="h-3 w-3" />
          {task.reward_amount}
        </span>
      </div>
    </div>

    <span class="hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-block {getPriorityClass()}">
      {task.priority}
    </span>

    <div class="shrink-0 font-mono text-sm font-semibold countdown-digits {getCountdownStyle()}">
      {task.status === 'completed' ? 'done' : countdown}
    </div>

    <svg
      class="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
    >
      <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  </button>
{/if}
