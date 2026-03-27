"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CountdownCard } from "@/components/countdown-card";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { Separator } from "@/components/ui/separator";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { useAuth } from "@/lib/auth-context";
import { getTasks, checkPenalties } from "@/lib/api";
import type { Task } from "@/types/task";

const now = new Date();

const demoTasks: Task[] = [
  {
    id: "1",
    title: "Submit project proposal to the team",
    description: null,
    deadline: new Date(now.getTime() + 42 * 60 * 1000).toISOString(),
    status: "active",
    priority: "urgent",
    reward_amount: 15,
    penalty_rate: 2,
    is_completed: false,
    completed_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tags: [{ id: "t1", name: "Work", color: "#3B82F6" }],
  },
  {
    id: "2",
    title: "Finish cleaning up my room",
    description: null,
    deadline: new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString(),
    status: "active",
    priority: "medium",
    reward_amount: 5,
    penalty_rate: 1,
    is_completed: false,
    completed_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tags: [
      { id: "t2", name: "Personal", color: "#8B5CF6" },
      { id: "t3", name: "Home", color: "#EC4899" },
    ],
  },
  {
    id: "3",
    title: "Fix authentication bug in API",
    description: null,
    deadline: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    priority: "high",
    reward_amount: 10,
    penalty_rate: 2,
    is_completed: false,
    completed_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tags: [
      { id: "t1", name: "Work", color: "#3B82F6" },
      { id: "t4", name: "Bug", color: "#EF4444" },
    ],
  },
  {
    id: "4",
    title: "Write unit tests for payment module",
    description: null,
    deadline: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    priority: "medium",
    reward_amount: 8,
    penalty_rate: 1,
    is_completed: false,
    completed_at: null,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tags: [{ id: "t5", name: "Testing", color: "#10B981" }],
  },
  {
    id: "5",
    title: "Read 30 pages of Design Patterns",
    description: null,
    deadline: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    priority: "low",
    reward_amount: 3,
    penalty_rate: 1,
    is_completed: true,
    completed_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tags: [{ id: "t6", name: "Learning", color: "#10B981" }],
  },
  {
    id: "6",
    title: "Review pull request #247",
    description: null,
    deadline: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    status: "completed",
    priority: "medium",
    reward_amount: 4,
    penalty_rate: 1,
    is_completed: true,
    completed_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(),
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    tags: [{ id: "t1", name: "Work", color: "#3B82F6" }],
  },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadTasks() {
    try {
      const data = await getTasks();
      setTasks(data);
      return data;
    } catch {
      setTasks(demoTasks);
      return null;
    }
  }

  async function runPenaltyCheck() {
    try {
      const result = await checkPenalties();
      if (result.penalties_applied > 0) {
        toast.warning(`${result.penalties_applied} overdue task${result.penalties_applied > 1 ? "s" : ""} penalised`);
        await loadTasks();
        refreshUser?.();
      }
    } catch {
      // penalties not available — silent fail
    }
  }

  useEffect(() => {
    if (!isLoading && user) {
      loadTasks().then((data) => {
        if (data !== null) {
          runPenaltyCheck();
        }
      });
    } else if (!isLoading && !user) {
      setTasks(demoTasks);
    }
  }, [isLoading, user]);

  const activeTasks = useMemo(() => tasks.filter((t) => !t.is_completed), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((t) => t.is_completed), [tasks]);

  const totalReward = useMemo(
    () => activeTasks.reduce((sum, t) => sum + t.reward_amount, 0),
    [activeTasks],
  );

  const displayName = user?.display_name ?? "there";
  const balance = user?.currency_balance ?? 0;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar onNewTask={() => setDialogOpen(true)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          currencyBalance={balance}
          userName={displayName}
          onNewTask={() => setDialogOpen(true)}
        />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {/* Header */}
          <div className="px-6 pt-8 pb-2 md:px-8">
            <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
              {getGreeting()}, {displayName}
            </h1>
          </div>

          {/* Stats row */}
          <div className="flex gap-6 px-6 pt-4 pb-6 md:px-8">
            <div>
              <p className="font-mono text-2xl font-bold countdown-digits">{activeTasks.length}</p>
              <p className="text-[11px] text-muted-foreground">Active</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div>
              <p className="font-mono text-2xl font-bold countdown-digits">{completedTasks.length}</p>
              <p className="text-[11px] text-muted-foreground">Done</p>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <div>
              <p className="font-mono text-2xl font-bold countdown-digits text-chart-2">{totalReward}</p>
              <p className="text-[11px] text-muted-foreground">At stake</p>
            </div>
          </div>

          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <section>
              <div className="flex items-center gap-2 px-6 pb-1 md:px-8">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Active
                </h2>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  {activeTasks.length}
                </span>
              </div>
              <div className="divide-y divide-border border-y border-border">
                {activeTasks.map((task) => (
                  <CountdownCard
                    key={task.id}
                    task={task}
                    onOpen={(id) => router.push(`/tasks/${id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <section className="mt-8">
              <div className="flex items-center gap-2 px-6 pb-1 md:px-8">
                <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Completed
                </h2>
                <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                  {completedTasks.length}
                </span>
              </div>
              <div className="divide-y divide-border border-y border-border">
                {completedTasks.map((task) => (
                  <CountdownCard
                    key={task.id}
                    task={task}
                    onOpen={(id) => router.push(`/tasks/${id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          <div className="h-8" />
        </main>
      </div>

      <BottomNav />

      <CreateTaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={loadTasks}
      />
    </div>
  );
}
