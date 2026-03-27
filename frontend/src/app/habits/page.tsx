"use client";

import { useEffect, useState, useCallback } from "react";
import { Zap, Plus, Flame, Check, Calendar, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/lib/auth-context";
import {
  getHabits,
  createHabit,
  deleteHabit,
  checkInHabit,
  getHabitHistory,
} from "@/lib/api";
import type { Habit, HabitHistoryEntry } from "@/types/task";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Constants ───────────────────────────────────────────────────────────────

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
  "#a16207", // amber-dark
];

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildYearGrid(year: number): Date[] {
  // Start from Jan 1 of the year, pad to the nearest Sunday before
  const jan1 = new Date(year, 0, 1);
  const startDayOfWeek = jan1.getDay(); // 0=Sun
  const start = new Date(jan1);
  start.setDate(start.getDate() - startDayOfWeek);

  const cells: Date[] = [];
  const cur = new Date(start);
  // 53 weeks * 7 = 371 days, enough to cover any year
  for (let i = 0; i < 53 * 7; i++) {
    cells.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(history: HabitHistoryEntry[]): number {
  const completed = new Set(history.filter((h) => h.completed).map((h) => h.date));
  const today = new Date();
  let streak = 0;
  const cur = new Date(today);
  while (true) {
    const key = dateToKey(cur);
    if (completed.has(key)) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

// ─── Dot Grid ─────────────────────────────────────────────────────────────────

function DotGrid({ habit, history }: { habit: Habit; history: HabitHistoryEntry[] }) {
  const year = new Date().getFullYear();
  const cells = buildYearGrid(year);
  const completedSet = new Set(history.filter((h) => h.completed).map((h) => h.date));
  const totalCompletions = history.filter((h) => h.completed).length;
  const streak = computeStreak(history);

  // Build month label positions — find first cell of each month
  const monthPositions: { col: number; label: string }[] = [];
  for (let col = 0; col < 53; col++) {
    const cellIndex = col * 7;
    if (cellIndex >= cells.length) break;
    const cell = cells[cellIndex];
    if (cell.getFullYear() === year) {
      const month = cell.getMonth();
      // Only add if it's the first occurrence of this month
      if (!monthPositions.find((mp) => mp.label === MONTH_LABELS[month])) {
        monthPositions.push({ col, label: MONTH_LABELS[month] });
      }
    }
  }

  return (
    <div className="mt-4">
      {/* Month labels */}
      <div
        className="mb-1"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(53, 12px)",
          gap: "2px",
        }}
      >
        {Array.from({ length: 53 }, (_, col) => {
          const mp = monthPositions.find((m) => m.col === col);
          return (
            <div
              key={col}
              className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground"
              style={{ width: 12 }}
            >
              {mp ? mp.label : ""}
            </div>
          );
        })}
      </div>

      {/* Grid: 7 rows x 53 cols (row-major laid out as col-major) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(53, 12px)",
          gridTemplateRows: "repeat(7, 12px)",
          gap: "2px",
          gridAutoFlow: "column",
        }}
      >
        {cells.map((cell, i) => {
          const key = dateToKey(cell);
          const isThisYear = cell.getFullYear() === year;
          const done = isThisYear && completedSet.has(key);
          const isToday = key === getTodayString();

          return (
            <div
              key={i}
              title={key}
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: !isThisYear
                  ? "transparent"
                  : done
                  ? habit.color
                  : `${habit.color}1a`,
                outline: isToday ? `1.5px solid ${habit.color}` : undefined,
                outlineOffset: isToday ? "1px" : undefined,
              }}
            />
          );
        })}
      </div>

      {/* Stats below grid */}
      <div className="mt-3 flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <Flame className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
          <span className="font-mono text-sm font-bold countdown-digits">{streak}</span>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">streak</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          <span className="font-mono text-sm font-bold countdown-digits">{totalCompletions}</span>
          <span className="text-[11px] uppercase tracking-widest text-muted-foreground">total</span>
        </div>
      </div>
    </div>
  );
}

// ─── Habit Row ────────────────────────────────────────────────────────────────

function HabitRow({
  habit,
  checkedToday,
  onCheckIn,
  onDelete,
}: {
  habit: Habit;
  checkedToday: boolean;
  onCheckIn: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<HabitHistoryEntry[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const streak = history ? computeStreak(history) : null;

  const handleExpand = useCallback(async () => {
    const next = !expanded;
    setExpanded(next);
    if (next && history === null) {
      setLoadingHistory(true);
      try {
        const data = await getHabitHistory(habit.id, new Date().getFullYear());
        setHistory(data);
      } catch {
        setHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    }
  }, [expanded, history, habit.id]);

  const cadenceBadgeColor: Record<string, string> = {
    daily: "bg-blue-500/10 text-blue-400",
    weekly: "bg-violet-500/10 text-violet-400",
    monthly: "bg-amber-500/10 text-amber-400",
  };

  return (
    <div className="rounded-lg border border-border bg-background transition-colors">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Color dot */}
        <div
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: habit.color }}
        />

        {/* Name */}
        <span className="flex-1 text-sm font-medium">{habit.name}</span>

        {/* Cadence badge */}
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cadenceBadgeColor[habit.cadence] ?? ""}`}
        >
          {habit.cadence}
        </span>

        {/* Streak */}
        {streak !== null && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
            <span className="font-mono text-xs countdown-digits">{streak}</span>
          </div>
        )}

        {/* Check-in button */}
        <button
          onClick={() => onCheckIn(habit.id)}
          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
            checkedToday
              ? "border-transparent text-white"
              : "border-border text-transparent hover:border-muted-foreground"
          }`}
          style={checkedToday ? { backgroundColor: habit.color, borderColor: habit.color } : {}}
          title={checkedToday ? "Checked in" : "Check in"}
          aria-label={checkedToday ? "Checked in today" : "Check in for today"}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>

        {/* Expand toggle */}
        <button
          onClick={handleExpand}
          className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label={expanded ? "Collapse" : "Expand year view"}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
          ) : (
            <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
          )}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(habit.id)}
          className="flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:text-destructive"
          aria-label="Delete habit"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* Expanded: dot grid */}
      {expanded && (
        <div className="overflow-x-auto border-t border-border px-4 pb-4">
          {loadingHistory ? (
            <div className="py-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground">
              Loading…
            </div>
          ) : history !== null ? (
            <DotGrid habit={habit} history={history} />
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Create Habit Dialog ──────────────────────────────────────────────────────

function CreateHabitDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (h: Habit) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[4]);
  const [cadence, setCadence] = useState<"daily" | "weekly" | "monthly">("daily");
  const [reward, setReward] = useState("1");
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setColor(PRESET_COLORS[4]);
    setCadence("daily");
    setReward("1");
  }

  function handleOpenChange(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const habit = await createHabit({
        name: name.trim(),
        color,
        cadence,
        reward_amount: parseFloat(reward) || 1,
      });
      onCreated(habit);
      onOpenChange(false);
      reset();
    } catch {
      toast.error("Failed to create habit.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Habit</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-name" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Name
            </Label>
            <Input
              id="habit-name"
              placeholder="e.g. Morning run"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="relative h-6 w-6 rounded-full transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                  type="button"
                >
                  {color === c && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Cadence */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Cadence
            </Label>
            <Select
              value={cadence}
              onValueChange={(v) => setCadence(v as "daily" | "weekly" | "monthly")}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reward */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="habit-reward" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
              Reward (rupees)
            </Label>
            <Input
              id="habit-reward"
              type="number"
              min="0"
              step="0.5"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate} disabled={!name.trim() || loading} size="sm">
            {loading ? "Creating…" : "Create Habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const { user, isLoading } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkedToday, setCheckedToday] = useState<Set<string>>(new Set());
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const balance = user?.currency_balance ?? 0;
  const displayName = user?.display_name ?? "there";

  useEffect(() => {
    if (!isLoading && user) {
      getHabits()
        .then((data) => setHabits(data))
        .catch(() => toast.error("Could not load habits."))
        .finally(() => setFetching(false));
    }
  }, [isLoading, user]);

  async function handleCheckIn(id: string) {
    if (checkedToday.has(id)) return;
    try {
      await checkInHabit(id);
      setCheckedToday((prev) => new Set([...prev, id]));
      const habit = habits.find((h) => h.id === id);
      toast.success(
        `Checked in${habit ? ` · ${habit.name}` : ""}! +${habit?.reward_amount ?? 1} rupee`
      );
    } catch {
      toast.error("Check-in failed. Try again.");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteHabit(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      toast.success("Habit deleted.");
    } catch {
      toast.error("Could not delete habit.");
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar currencyBalance={balance} userName={displayName} />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {/* Header */}
          <div className="flex items-end justify-between px-6 pt-8 pb-6 md:px-8">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Habits
                </p>
              </div>
              <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">
                Habit Tracker
              </h1>
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
              New Habit
            </Button>
          </div>

          {/* Habit list */}
          <div className="px-6 md:px-8">
            {fetching ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-lg bg-secondary" />
                ))}
              </div>
            ) : habits.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
                <Calendar className="mb-3 h-8 w-8 text-muted-foreground" strokeWidth={1} />
                <p className="text-sm font-medium">No habits yet</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Create your first habit to start tracking.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {habits.map((habit) => (
                  <HabitRow
                    key={habit.id}
                    habit={habit}
                    checkedToday={checkedToday.has(habit.id)}
                    onCheckIn={handleCheckIn}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-8" />
        </main>
      </div>

      <BottomNav />

      <CreateHabitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={(h) => setHabits((prev) => [h, ...prev])}
      />
    </div>
  );
}
