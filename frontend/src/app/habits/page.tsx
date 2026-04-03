"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  checkMissedHabits,
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

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface WeekColumn {
  weekIndex: number;
  days: (Date | null)[];
}

function buildYearGrid(year: number): WeekColumn[] {
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);

  const weeks: WeekColumn[] = [];
  const cur = new Date(jan1);
  let weekIndex = 0;

  // First week: pad days before Jan 1 with null
  const firstDayOfWeek = jan1.getDay(); // 0=Sun
  const firstWeek: (Date | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    firstWeek.push(null);
  }
  // Fill rest of first week
  while (firstWeek.length < 7 && cur <= dec31) {
    firstWeek.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  weeks.push({ weekIndex, days: firstWeek });
  weekIndex++;

  // Remaining weeks
  while (cur <= dec31) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7 && cur <= dec31; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    // Pad last week with nulls
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push({ weekIndex, days: week });
    weekIndex++;
  }

  return weeks;
}

function dateToKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeStreak(history: HabitHistoryEntry[]): number {
  const completed = new Set(history.filter((h) => h.completed).map((h) => h.date));
  const today = new Date();
  let streak = 0;
  const cur = new Date(today);

  // If today is checked, count it and go backwards
  // If today is NOT checked, start from yesterday
  if (!completed.has(dateToKey(cur))) {
    cur.setDate(cur.getDate() - 1);
  }

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
  const weeks = buildYearGrid(year);
  const completedSet = new Set(history.filter((h) => h.completed).map((h) => h.date));
  const totalCompletions = history.filter((h) => h.completed).length;
  const streak = computeStreak(history);
  const today = getTodayString();
  const totalWeeks = weeks.length;

  // Month labels: find the first week where a month starts
  const monthPositions: { col: number; month: number }[] = [];
  const seenMonths = new Set<number>();
  for (let w = 0; w < totalWeeks; w++) {
    for (const day of weeks[w].days) {
      if (day && day.getFullYear() === year && !seenMonths.has(day.getMonth())) {
        seenMonths.add(day.getMonth());
        monthPositions.push({ col: w, month: day.getMonth() });
        break;
      }
    }
  }

  return (
    <div className="mt-4 w-full">
      {/* Month labels */}
      <div
        className="mb-1"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`,
          gap: "2px",
        }}
      >
        {Array.from({ length: totalWeeks }, (_, col) => {
          const mp = monthPositions.find((m) => m.col === col);
          return (
            <div key={col} className="text-[9px] font-medium text-muted-foreground overflow-hidden">
              {mp ? MONTH_LABELS[mp.month] : ""}
            </div>
          );
        })}
      </div>

      {/* Grid: columns=weeks, rows=days(0=Sun…6=Sat) */}
      {/* Each week is a column; within each week cells flow top-to-bottom (Sun→Sat) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`,
          gridTemplateRows: "repeat(7, 1fr)",
          gap: "2px",
          aspectRatio: `${totalWeeks} / 7`,
        }}
      >
        {weeks.map((week) =>
          week.days.map((day, dayIdx) => {
            // Place each cell explicitly: row = dayIdx+1, col = weekIndex+1
            if (!day) {
              return (
                <div
                  key={`${week.weekIndex}-${dayIdx}`}
                  style={{
                    gridColumn: week.weekIndex + 1,
                    gridRow: dayIdx + 1,
                  }}
                />
              );
            }
            const key = dateToKey(day);
            const done = completedSet.has(key);
            const isToday = key === today;
            return (
              <div
                key={`${week.weekIndex}-${dayIdx}`}
                title={`${key}${done ? " (done)" : ""}`}
                style={{
                  gridColumn: week.weekIndex + 1,
                  gridRow: dayIdx + 1,
                  borderRadius: 2,
                  backgroundColor: done ? habit.color : `${habit.color}1a`,
                  outline: isToday ? `2px solid ${habit.color}` : undefined,
                  outlineOffset: isToday ? "1px" : undefined,
                }}
              />
            );
          })
        )}
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
  refreshKey,
  initialStreak,
  onStreakUpdate,
}: {
  habit: Habit;
  checkedToday: boolean;
  onCheckIn: (id: string) => void;
  onDelete: (id: string) => void;
  refreshKey: number;
  initialStreak: number;
  onStreakUpdate: (id: string, streak: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<HabitHistoryEntry[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const streak = history ? computeStreak(history) : initialStreak;
  const onStreakUpdateRef = useRef(onStreakUpdate);
  onStreakUpdateRef.current = onStreakUpdate;

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getHabitHistory(habit.id, new Date().getFullYear());
      setHistory(data);
      onStreakUpdateRef.current(habit.id, computeStreak(data));
    } catch {
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [habit.id]);

  // Re-fetch history when expanded or when refreshKey increments (after check-in)
  useEffect(() => {
    if (expanded || refreshKey > 0) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, refreshKey]);

  const handleExpand = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

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
  const { user, isLoading, refreshUser } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [checkedToday, setCheckedToday] = useState<Set<string>>(new Set());
  const [streaks, setStreaks] = useState<Record<string, number>>({});
  const [refreshKeys, setRefreshKeys] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const balance = user?.currency_balance ?? 0;
  const displayName = user?.display_name ?? "there";

  useEffect(() => {
    if (!isLoading && user) {
      getHabits()
        .then(async (data) => {
          setHabits(data);
          const today = getTodayString();
          const checked = new Set<string>();
          const streakMap: Record<string, number> = {};
          for (const habit of data) {
            try {
              const history = await getHabitHistory(habit.id, new Date().getFullYear());
              if (history.some((e) => e.date === today && e.completed)) {
                checked.add(habit.id);
              }
              streakMap[habit.id] = computeStreak(history);
            } catch { /* ignore */ }
          }
          setCheckedToday(checked);
          setStreaks(streakMap);

          // Check for missed habits and apply penalties
          try {
            const missed = await checkMissedHabits();
            if (missed.total_penalty > 0) {
              for (const d of missed.details) {
                toast.warning(`Missed ${d.missed_days} day(s) of ${d.habit}. -${d.penalty} rupees`);
              }
              refreshUser?.();
            }
          } catch { /* ignore */ }
        })
        .catch(() => toast.error("Could not load habits."))
        .finally(() => setFetching(false));
    }
  }, [isLoading, user]);

  async function handleCheckIn(id: string) {
    const isChecked = checkedToday.has(id);
    if (isChecked) {
      if (!window.confirm("Undo today's check-in? You'll lose the rupees earned.")) return;
    }
    try {
      await checkInHabit(id);
      const habit = habits.find((h) => h.id === id);
      if (isChecked) {
        setCheckedToday((prev) => { const next = new Set(prev); next.delete(id); return next; });
        toast("Check-in undone", { description: habit?.name });
      } else {
        setCheckedToday((prev) => new Set([...prev, id]));
        toast.success(`Checked in · ${habit?.name ?? ""}! +${habit?.reward_amount ?? 1} rupee`);
      }
      // Bump refreshKey so expanded HabitRow re-fetches history
      setRefreshKeys((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
      // Update streak eagerly
      try {
        const history = await getHabitHistory(id, new Date().getFullYear());
        setStreaks((prev) => ({ ...prev, [id]: computeStreak(history) }));
      } catch { /* ignore */ }
      refreshUser?.();
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
              <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              </p>
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
                    refreshKey={refreshKeys[habit.id] ?? 0}
                    initialStreak={streaks[habit.id] ?? 0}
                    onStreakUpdate={(id, s) => setStreaks((prev) => ({ ...prev, [id]: s }))}
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
