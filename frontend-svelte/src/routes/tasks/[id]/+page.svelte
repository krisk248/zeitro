<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import { ArrowLeft, Check, Trash2, Pencil, Copy, Coins, Flame, Calendar, Tag as TagIcon, FileText } from 'lucide-svelte';
  import { user, refreshUser } from '$lib/auth';
  import { api, completeTask, deleteTask, duplicateTask } from '$lib/api';
  import { calculateTimeRemaining, formatCountdown } from '$lib/countdown';
  import type { Task } from '$lib/types/task';
  import type { TimeRemaining } from '$lib/countdown';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import TopBar from '$lib/components/TopBar.svelte';
  import BottomNav from '$lib/components/BottomNav.svelte';
  import WorkSessionTracker from '$lib/components/WorkSessionTracker.svelte';
  import CreateTaskDialog from '$lib/components/CreateTaskDialog.svelte';

  let id = $derived($page.params.id);
  let task = $state<Task | null>(null);
  let error = $state('');
  let editOpen = $state(false);

  async function load() {
    try {
      task = await api.get<Task>(`/api/v1/tasks/${id}`);
    } catch {
      error = 'Task not found';
    }
  }

  $effect(() => {
    if ($user) load();
  });

  async function handleComplete() {
    if (!task) return;
    try {
      const updated = await completeTask(task.id);
      task = updated;
      refreshUser();
      toast.success('Task completed — reward earned!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to complete task.');
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await deleteTask(task.id);
      toast.success('Task deleted');
      goto('/');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task.');
    }
  }

  async function handleDuplicate() {
    if (!task) return;
    try {
      const newTask = await duplicateTask(task.id);
      toast.success('Task duplicated');
      goto(`/tasks/${newTask.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to duplicate task.');
    }
  }

  let balance = $derived($user?.currency_balance ?? 0);
  let displayName = $derived($user?.display_name ?? 'there');

  // Countdown live
  let time = $state<TimeRemaining | null>(null);
  let countdownInterval: ReturnType<typeof setInterval> | null = null;

  $effect(() => {
    if (task) {
      time = calculateTimeRemaining(task.deadline);
      if (countdownInterval) clearInterval(countdownInterval);
      if (!task.is_completed) {
        countdownInterval = setInterval(() => {
          time = calculateTimeRemaining(task!.deadline);
        }, 1000);
      }
    }
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  });

  onDestroy(() => {
    if (countdownInterval) clearInterval(countdownInterval);
  });

  let countdown = $derived(time ? formatCountdown(time) : '');

  function getStatusClass(): string {
    if (!task || !time) return '';
    if (task.status === 'completed') return 'bg-success/10 text-success';
    if (task.status === 'overdue' || time.is_overdue) return 'bg-destructive/10 text-destructive';
    return 'bg-secondary text-muted-foreground';
  }

  function getPriorityClass(): string {
    if (!task) return '';
    if (task.priority === 'urgent') return 'bg-destructive/10 text-destructive';
    if (task.priority === 'high') return 'bg-warning/10 text-warning';
    return 'bg-secondary text-muted-foreground';
  }

  function getCountdownClass(): string {
    if (!task || !time) return '';
    if (task.is_completed) return 'text-success';
    if (time.is_overdue) return 'text-destructive';
    if (time.total_seconds < 3600) return 'text-warning';
    return 'text-foreground';
  }
</script>

{#if error}
  <div class="flex h-screen overflow-hidden">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <TopBar currencyBalance={balance} userName={displayName} />
      <main class="flex flex-1 items-center justify-center overflow-y-auto pb-16 md:pb-0">
        <p class="text-sm text-muted-foreground">{error}</p>
      </main>
    </div>
    <BottomNav />
  </div>
{:else if !task}
  <div class="flex h-screen overflow-hidden">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <TopBar currencyBalance={balance} userName={displayName} />
      <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div class="mx-auto max-w-2xl space-y-2 px-4 py-6 md:px-8">
          <div class="h-6 w-1/3 rounded bg-secondary animate-pulse"></div>
          <div class="h-8 w-2/3 rounded bg-secondary animate-pulse"></div>
          <div class="h-px bg-border my-4"></div>
          <div class="h-12 w-1/2 rounded bg-secondary animate-pulse"></div>
        </div>
      </main>
    </div>
    <BottomNav />
  </div>
{:else}
  <div class="flex h-screen overflow-hidden">
    <Sidebar />
    <div class="flex flex-1 flex-col overflow-hidden">
      <TopBar currencyBalance={balance} userName={displayName} />
      <main class="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div class="mx-auto max-w-2xl px-4 py-6 md:px-8">
          <!-- Back button -->
          <button
            onclick={() => goto('/')}
            class="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft class="h-4 w-4" />
            Back
          </button>

          <!-- Task header -->
          <div class="space-y-3">
            <div class="flex items-start justify-between gap-4">
              <h1 class="font-heading text-xl font-semibold tracking-tight">{task.title}</h1>
              <div class="flex shrink-0 items-center gap-1.5">
                {#if !task.is_completed}
                  <button
                    onclick={() => editOpen = true}
                    class="flex h-8 items-center gap-1.5 rounded-md bg-secondary px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onclick={handleComplete}
                    class="flex h-8 items-center gap-1.5 rounded-md bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20"
                  >
                    <Check class="h-3.5 w-3.5" />
                    Complete
                  </button>
                {/if}
                <button
                  onclick={handleDuplicate}
                  class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Duplicate task"
                >
                  <Copy class="h-3.5 w-3.5" />
                </button>
                <button
                  onclick={handleDelete}
                  class="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 class="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <!-- Status pills -->
            <div class="flex flex-wrap items-center gap-2 text-xs">
              <span class="rounded px-1.5 py-0.5 font-medium uppercase tracking-wider {getStatusClass()}">
                {time && time.is_overdue && task.status !== 'completed' ? 'overdue' : task.status}
              </span>
              <span class="rounded px-1.5 py-0.5 font-medium uppercase tracking-wider {getPriorityClass()}">
                {task.priority}
              </span>
            </div>
          </div>

          <div class="h-px bg-border my-5"></div>

          <!-- Countdown -->
          <div>
            <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Countdown</p>
            <p class="mt-1 font-mono text-4xl font-bold countdown-digits {getCountdownClass()}">
              {task.is_completed ? 'Completed' : countdown}
            </p>
            {#if task.is_completed && task.completed_at}
              <p class="mt-1 text-xs text-muted-foreground">
                Completed {new Date(task.completed_at).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </p>
            {/if}
          </div>

          <div class="h-px bg-border my-5"></div>

          <!-- Work Session Tracker -->
          <WorkSessionTracker taskId={task.id} isCompleted={task.is_completed} />

          <div class="h-px bg-border my-5"></div>

          <!-- Details -->
          <div class="space-y-3">
            <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Details</p>

            <div class="space-y-2 text-sm">
              <div class="flex items-center gap-2 text-muted-foreground">
                <Calendar class="h-3.5 w-3.5" />
                <span>
                  Deadline: {new Date(task.deadline).toLocaleDateString('en-IN', {
                    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>

              <div class="flex items-center gap-2 text-muted-foreground">
                <Coins class="h-3.5 w-3.5 text-success" />
                <span>Reward: +{task.reward_amount} rupees</span>
              </div>

              <div class="flex items-center gap-2 text-muted-foreground">
                <Flame class="h-3.5 w-3.5 text-destructive" />
                <span>Penalty: -{task.penalty_rate} per 12h overdue</span>
              </div>

              {#if task.tags.length > 0}
                <div class="flex items-center gap-2 text-muted-foreground">
                  <TagIcon class="h-3.5 w-3.5" />
                  <div class="flex gap-1.5">
                    {#each task.tags as tag}
                      <span
                        class="rounded px-1.5 py-0.5 text-[10px] font-medium"
                        style="background-color: {tag.color}15; color: {tag.color}"
                      >
                        {tag.name}
                      </span>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            {#if task.description}
              <div class="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
                <p class="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              </div>
            {/if}

            {#if task.notes}
              <div class="mt-3">
                <div class="flex items-center gap-1.5 mb-1.5">
                  <FileText class="h-3.5 w-3.5 text-muted-foreground" />
                  <p class="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Notes</p>
                </div>
                <div class="rounded-lg border border-border bg-secondary/30 p-4">
                  <p class="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
                </div>
              </div>
            {/if}
          </div>

          <CreateTaskDialog bind:open={editOpen} {task} onCreated={load} />
        </div>
      </main>
    </div>
    <BottomNav />
  </div>
{/if}
