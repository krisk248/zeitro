"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Trash2, Pencil, Copy, Coins, Flame, Calendar, Tag as TagIcon, FileText } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { WorkSessionTracker } from "@/components/work-session-tracker";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { useAuth } from "@/lib/auth-context";
import { api, completeTask, deleteTask, duplicateTask } from "@/lib/api";
import { calculateTimeRemaining, formatCountdown } from "@/lib/countdown";
import type { Task } from "@/types/task";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  async function load() {
    try {
      const data = await api.get<Task>(`/api/v1/tasks/${id}`);
      setTask(data);
    } catch {
      setError("Task not found");
    }
  }

  useEffect(() => {
    if (user) load();
  }, [id, user]);

  async function handleComplete() {
    if (!task) return;
    try {
      const updated = await completeTask(task.id);
      setTask(updated);
      refreshUser?.();
      toast.success("Task completed — reward earned!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete task.");
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      await deleteTask(task.id);
      toast.success("Task deleted");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete task.");
    }
  }

  async function handleDuplicate() {
    if (!task) return;
    try {
      const newTask = await duplicateTask(task.id);
      toast.success("Task duplicated");
      router.push(`/tasks/${newTask.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate task.");
    }
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="space-y-2 w-full max-w-2xl px-4 md:px-8">
          <div className="h-6 w-1/3 rounded bg-secondary animate-pulse" />
          <div className="h-8 w-2/3 rounded bg-secondary animate-pulse" />
          <div className="h-px bg-border my-4" />
          <div className="h-12 w-1/2 rounded bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  const time = calculateTimeRemaining(task.deadline);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-8">
      {/* Back button */}
      <button
        onClick={() => router.push("/")}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Task header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="font-heading text-xl font-semibold tracking-tight">{task.title}</h1>
          <div className="flex shrink-0 items-center gap-1.5">
            {!task.is_completed && (
              <>
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-secondary px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleComplete}
                  className="flex h-8 items-center gap-1.5 rounded-md bg-success/10 px-3 text-xs font-medium text-success transition-colors hover:bg-success/20"
                >
                  <Check className="h-3.5 w-3.5" />
                  Complete
                </button>
              </>
            )}
            <button
              onClick={handleDuplicate}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Duplicate task"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleDelete}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className={`rounded px-1.5 py-0.5 font-medium uppercase tracking-wider ${
            task.status === "completed"
              ? "bg-success/10 text-success"
              : task.status === "overdue" || time.is_overdue
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-muted-foreground"
          }`}>
            {time.is_overdue && task.status !== "completed" ? "overdue" : task.status}
          </span>
          <span className={`rounded px-1.5 py-0.5 font-medium uppercase tracking-wider ${
            task.priority === "urgent"
              ? "bg-destructive/10 text-destructive"
              : task.priority === "high"
                ? "bg-warning/10 text-warning"
                : "bg-secondary text-muted-foreground"
          }`}>
            {task.priority}
          </span>
        </div>
      </div>

      <Separator className="my-5" />

      {/* Countdown */}
      <CountdownLive task={task} />

      <Separator className="my-5" />

      {/* Work Session Tracker */}
      <WorkSessionTracker taskId={task.id} isCompleted={task.is_completed} />

      <Separator className="my-5" />

      {/* Details */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Details
        </p>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Deadline:{" "}
              {new Date(task.deadline).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-3.5 w-3.5 text-success" />
            <span>Reward: +{task.reward_amount} rupees</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-destructive" />
            <span>Penalty: -{task.penalty_rate} per 12h overdue</span>
          </div>

          {task.tags.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <TagIcon className="h-3.5 w-3.5" />
              <div className="flex gap-1.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {task.description && (
          <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {task.notes && (
          <div className="mt-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Notes</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.notes}</p>
            </div>
          </div>
        )}
      </div>

      <CreateTaskDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        task={task}
        onCreated={load}
      />
    </div>
  );
}

function CountdownLive({ task }: { task: Task }) {
  const [time, setTime] = useState(() => calculateTimeRemaining(task.deadline));

  useEffect(() => {
    if (task.is_completed) return;
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining(task.deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [task.deadline, task.is_completed]);

  const countdown = formatCountdown(time);

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Countdown
      </p>
      <p className={`mt-1 font-mono text-4xl font-bold countdown-digits ${
        task.is_completed
          ? "text-success"
          : time.is_overdue
            ? "text-destructive"
            : time.total_seconds < 3600
              ? "text-warning"
              : "text-foreground"
      }`}>
        {task.is_completed ? "Completed" : countdown}
      </p>
      {task.is_completed && task.completed_at && (
        <p className="mt-1 text-xs text-muted-foreground">
          Completed {new Date(task.completed_at).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
