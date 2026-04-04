<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { createTask, updateTask, getTags, createTag } from '$lib/api';
  import type { CreateTaskData } from '$lib/api';
  import type { Tag, Task, TaskPriority } from '$lib/types/task';

  const DEFAULT_TAG_COLOR = '#6366f1';

  let {
    open = $bindable(false),
    onCreated,
    task,
  }: {
    open?: boolean;
    onCreated?: () => void;
    task?: Task;
  } = $props();

  let isEditing = $derived(!!task);

  const PRIORITIES: { value: TaskPriority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const PRIORITY_DOT: Record<TaskPriority, string> = {
    low: 'bg-muted-foreground',
    medium: 'bg-chart-2',
    high: 'bg-warning',
    urgent: 'bg-destructive',
  };

  function toDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  let title = $state('');
  let description = $state('');
  let notes = $state('');
  let deadline = $state('');
  let priority = $state<TaskPriority>('medium');
  let reward = $state('5');
  let penaltyRate = $state('1');
  let tags = $state<Tag[]>([]);
  let selectedTagIds = $state<string[]>([]);
  let newTagInput = $state('');
  let creatingTag = $state(false);
  let error = $state<string | null>(null);
  let isPending = $state(false);

  $effect(() => {
    if (open) {
      getTags()
        .then(t => tags = t)
        .catch(() => tags = []);

      if (task) {
        title = task.title;
        description = task.description ?? '';
        notes = task.notes ?? '';
        deadline = toDatetimeLocal(task.deadline);
        priority = task.priority;
        reward = String(task.reward_amount);
        penaltyRate = String(task.penalty_rate);
        selectedTagIds = task.tags.map(t => t.id);
      }
    }
  });

  function resetForm() {
    title = '';
    description = '';
    notes = '';
    deadline = '';
    priority = 'medium';
    reward = '5';
    penaltyRate = '1';
    selectedTagIds = [];
    newTagInput = '';
    error = null;
  }

  function toggleTag(id: string) {
    selectedTagIds = selectedTagIds.includes(id)
      ? selectedTagIds.filter(t => t !== id)
      : [...selectedTagIds, id];
  }

  async function handleCreateNewTag() {
    const name = newTagInput.trim();
    if (!name) return;
    creatingTag = true;
    try {
      const tag = await createTag(name, DEFAULT_TAG_COLOR);
      tags = [...tags, tag].sort((a, b) => a.name.localeCompare(b.name));
      selectedTagIds = [...selectedTagIds, tag.id];
      newTagInput = '';
    } catch {
      // silent
    } finally {
      creatingTag = false;
    }
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!deadline) {
      error = 'Deadline is required.';
      return;
    }

    error = null;
    isPending = true;

    const data: CreateTaskData = {
      title: title.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      deadline: new Date(deadline).toISOString(),
      priority,
      reward_amount: parseFloat(reward) || 0,
      penalty_rate: parseFloat(penaltyRate) || 0,
      tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    try {
      if (isEditing && task) {
        await updateTask(task.id, data);
        toast.success('Task updated');
      } else {
        await createTask(data);
        toast.success('Task created');
      }
      resetForm();
      open = false;
      onCreated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEditing ? 'Failed to update task.' : 'Failed to create task.';
      error = msg;
      toast.error(msg);
    } finally {
      isPending = false;
    }
  }

  function handleClose() {
    resetForm();
    open = false;
  }
</script>

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    role="button"
    tabindex="-1"
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
  ></div>

  <!-- Dialog -->
  <div
    class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 shadow-2xl"
    role="dialog"
    aria-modal="true"
    aria-labelledby="dialog-title"
  >
    <div class="flex items-center justify-between mb-4">
      <h2 id="dialog-title" class="font-heading text-base font-semibold">
        {isEditing ? 'Edit task' : 'New task'}
      </h2>
      <button
        onclick={handleClose}
        class="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <div class="max-h-[70vh] overflow-y-auto pr-1">
      <form id="create-task-form" onsubmit={handleSubmit} class="flex flex-col gap-4">
        <!-- Title -->
        <div class="flex flex-col gap-1.5">
          <label for="task-title" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Title <span class="text-destructive">*</span>
          </label>
          <input
            id="task-title"
            type="text"
            placeholder="What needs to be done?"
            bind:value={title}
            required
            autofocus
            class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label for="task-desc" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Description
          </label>
          <textarea
            id="task-desc"
            placeholder="Optional details…"
            bind:value={description}
            class="min-h-[64px] resize-none rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
          ></textarea>
        </div>

        <!-- Notes -->
        <div class="flex flex-col gap-1.5">
          <label for="task-notes" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Notes
          </label>
          <textarea
            id="task-notes"
            placeholder="Add notes..."
            bind:value={notes}
            class="min-h-[56px] resize-none rounded-md border border-border bg-secondary/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/30 focus:outline-none"
          ></textarea>
        </div>

        <!-- Deadline -->
        <div class="flex flex-col gap-1.5">
          <label for="task-deadline" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Deadline <span class="text-destructive">*</span>
          </label>
          <input
            id="task-deadline"
            type="datetime-local"
            bind:value={deadline}
            required
            class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
          />
        </div>

        <!-- Priority + Reward row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label for="task-priority" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Priority
            </label>
            <select
              id="task-priority"
              bind:value={priority}
              class="h-9 rounded-md border border-border bg-secondary/30 px-3 text-sm text-foreground focus:border-foreground/30 focus:outline-none"
            >
              {#each PRIORITIES as p}
                <option value={p.value}>{p.label}</option>
              {/each}
            </select>
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="task-reward" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Reward
            </label>
            <div class="relative">
              <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-muted-foreground">Z</span>
              <input
                id="task-reward"
                type="number"
                min="0"
                step="1"
                bind:value={reward}
                class="h-9 w-full rounded-md border border-border bg-secondary/30 pl-6 font-mono text-sm text-foreground focus:border-foreground/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <!-- Penalty rate -->
        <div class="flex flex-col gap-1.5">
          <label for="task-penalty" class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            Penalty rate <span class="text-muted-foreground/60 normal-case tracking-normal font-normal">(per hour overdue)</span>
          </label>
          <div class="relative">
            <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-muted-foreground">Z</span>
            <input
              id="task-penalty"
              type="number"
              min="0"
              step="0.5"
              bind:value={penaltyRate}
              class="h-9 w-full rounded-md border border-border bg-secondary/30 pl-6 font-mono text-sm text-foreground focus:border-foreground/30 focus:outline-none"
            />
          </div>
        </div>

        <!-- Tags -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Tags</span>

          {#if selectedTagIds.length > 0}
            <div class="flex flex-wrap gap-1 mb-0.5">
              {#each tags.filter(t => selectedTagIds.includes(t.id)) as tag}
                <span
                  class="rounded px-2 py-0.5 text-[11px] font-medium"
                  style="background-color: {tag.color}25; color: {tag.color}; border: 1px solid {tag.color}40"
                >
                  {tag.name}
                </span>
              {/each}
            </div>
          {/if}

          {#if tags.length > 0}
            <div class="flex flex-wrap gap-1.5">
              {#each tags as tag}
                {@const selected = selectedTagIds.includes(tag.id)}
                <button
                  type="button"
                  onclick={() => toggleTag(tag.id)}
                  class="rounded px-2 py-0.5 text-[11px] font-medium transition-all"
                  style="background-color: {selected ? tag.color + '25' : 'transparent'}; color: {selected ? tag.color : 'var(--muted-foreground)'}; border: 1px solid {selected ? tag.color + '40' : 'var(--border)'}"
                >
                  {tag.name}
                </button>
              {/each}
            </div>
          {/if}

          <input
            type="text"
            bind:value={newTagInput}
            onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateNewTag(); } }}
            placeholder={creatingTag ? 'Creating…' : 'Type to create new tag…'}
            disabled={creatingTag}
            class="mt-0.5 rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground/60 focus:border-foreground/30 focus:outline-none disabled:opacity-50"
          />
        </div>

        {#if error}
          <p class="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
            {error}
          </p>
        {/if}
      </form>
    </div>

    <div class="mt-4 flex justify-end">
      <button
        type="submit"
        form="create-task-form"
        disabled={isPending || !title.trim()}
        class="flex h-8 items-center rounded-md bg-foreground px-4 text-xs font-medium text-background transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {#if isPending}
          {isEditing ? 'Saving…' : 'Creating…'}
        {:else}
          {isEditing ? 'Save changes' : 'Create task'}
        {/if}
      </button>
    </div>
  </div>
{/if}
