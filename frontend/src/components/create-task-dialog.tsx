"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTask, updateTask, getTags } from "@/lib/api";
import type { CreateTaskData } from "@/lib/api";
import type { Tag, Task, TaskPriority } from "@/types/task";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  task?: Task;
}

const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const PRIORITY_DOT: Record<TaskPriority, string> = {
  low: "bg-muted-foreground",
  medium: "bg-chart-2",
  high: "bg-warning",
  urgent: "bg-destructive",
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateTaskDialog({ open, onOpenChange, onCreated, task }: CreateTaskDialogProps) {
  const isEditing = !!task;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [reward, setReward] = useState("5");
  const [penaltyRate, setPenaltyRate] = useState("1");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (open) {
      getTags()
        .then(setTags)
        .catch(() => setTags([]));

      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setNotes(task.notes ?? "");
        setDeadline(toDatetimeLocal(task.deadline));
        setPriority(task.priority);
        setReward(String(task.reward_amount));
        setPenaltyRate(String(task.penalty_rate));
        setSelectedTagIds(task.tags.map((t) => t.id));
      }
    }
  }, [open, task]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setNotes("");
    setDeadline("");
    setPriority("medium");
    setReward("5");
    setPenaltyRate("1");
    setSelectedTagIds([]);
    setError(null);
  }

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (!deadline) {
      setError("Deadline is required.");
      return;
    }

    setError(null);
    setIsPending(true);

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
        toast.success("Task updated");
      } else {
        await createTask(data);
        toast.success("Task created");
      }
      resetForm();
      onOpenChange(false);
      onCreated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : isEditing ? "Failed to update task." : "Failed to create task.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>

        <form id="create-task-form" onSubmit={handleSubmit} className="flex flex-col gap-4 pt-1">
          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-title"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="h-9"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-desc" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="task-desc"
              placeholder="Optional details…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[64px] resize-none"
            />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-notes" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Notes
            </Label>
            <Textarea
              id="task-notes"
              placeholder="Add notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[56px] resize-none"
            />
          </div>

          {/* Deadline */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-deadline" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Deadline <span className="text-destructive">*</span>
            </Label>
            <Input
              id="task-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="h-9"
            />
          </div>

          {/* Priority + Reward row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Priority
              </Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${PRIORITY_DOT[p.value]}`} />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-reward" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Reward
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-muted-foreground">
                  Z
                </span>
                <Input
                  id="task-reward"
                  type="number"
                  min="0"
                  step="1"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  className="h-9 pl-6 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Penalty rate */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-penalty" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Penalty rate <span className="text-muted-foreground/60 normal-case tracking-normal font-normal">(per hour overdue)</span>
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-muted-foreground">
                Z
              </span>
              <Input
                id="task-penalty"
                type="number"
                min="0"
                step="0.5"
                value={penaltyRate}
                onChange={(e) => setPenaltyRate(e.target.value)}
                className="h-9 pl-6 font-mono"
              />
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Tags
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="rounded px-2 py-0.5 text-[11px] font-medium transition-all"
                      style={{
                        backgroundColor: selected ? `${tag.color}25` : "transparent",
                        color: selected ? tag.color : "var(--muted-foreground)",
                        border: `1px solid ${selected ? tag.color + "40" : "var(--border)"}`,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {error}
            </p>
          )}
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form="create-task-form"
            disabled={isPending || !title.trim()}
            size="sm"
          >
            {isPending
              ? isEditing ? "Saving…" : "Creating…"
              : isEditing ? "Save changes" : "Create task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
