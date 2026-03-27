"use client";

import { useEffect, useState } from "react";
import { BarChart3, Clock, CheckCircle2, Circle, AlertCircle, Flame, Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/lib/auth-context";
import {
  getAnalyticsSummary,
  getDailyAnalytics,
  getWeeklyAnalytics,
  getTagAnalytics,
  getHabitAnalytics,
} from "@/lib/api";
import type {
  AnalyticsSummary,
  DailyAnalytics,
  WeeklyAnalytics,
  TagAnalytics,
  HabitAnalytics,
} from "@/lib/api";

function StatBlock({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className={`font-mono text-2xl font-bold countdown-digits ${color ?? "text-foreground"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function AnalyticsPage() {
  const { user, isLoading } = useAuth();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [daily, setDaily] = useState<DailyAnalytics[]>([]);
  const [weekly, setWeekly] = useState<WeeklyAnalytics[]>([]);
  const [tagAnalytics, setTagAnalytics] = useState<TagAnalytics[]>([]);
  const [habitAnalytics, setHabitAnalytics] = useState<HabitAnalytics[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      Promise.all([
        getAnalyticsSummary(),
        getDailyAnalytics(),
        getWeeklyAnalytics().catch(() => [] as WeeklyAnalytics[]),
        getTagAnalytics().catch(() => [] as TagAnalytics[]),
        getHabitAnalytics().catch(() => [] as HabitAnalytics[]),
      ])
        .then(([s, d, w, t, h]) => {
          setSummary(s);
          setDaily(d);
          setWeekly(w);
          setTagAnalytics(t);
          setHabitAnalytics(h);
        })
        .catch(() => setError(true));
    }
  }, [isLoading, user]);

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
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar currencyBalance={balance} userName={displayName} />

        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {/* Header */}
          <div className="px-6 pt-8 pb-6 md:px-8">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                Analytics
              </p>
            </div>
            <h1 className="mt-1 font-heading text-xl font-semibold tracking-tight">Overview</h1>
          </div>

          {error && (
            <div className="mx-6 mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 md:mx-8">
              <p className="text-[12px] text-destructive">Could not load analytics data.</p>
            </div>
          )}

          {summary && (
            <>
              {/* Task counts */}
              <section className="px-6 md:px-8">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Tasks
                </p>
                <div className="grid grid-cols-2 gap-px rounded-lg border border-border bg-border sm:grid-cols-4">
                  <div className="flex flex-col gap-2 rounded-tl-lg bg-background px-5 py-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="text-[11px] uppercase tracking-widest font-semibold">Total</span>
                    </div>
                    <p className="font-mono text-3xl font-bold countdown-digits">{summary.total_tasks}</p>
                  </div>
                  <div className="flex flex-col gap-2 bg-background px-5 py-4 sm:rounded-none">
                    <div className="flex items-center gap-1.5 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="text-[11px] uppercase tracking-widest font-semibold">Done</span>
                    </div>
                    <p className="font-mono text-3xl font-bold countdown-digits text-success">{summary.completed_tasks}</p>
                  </div>
                  <div className="flex flex-col gap-2 bg-background px-5 py-4 rounded-bl-lg sm:rounded-none">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Circle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="text-[11px] uppercase tracking-widest font-semibold">Active</span>
                    </div>
                    <p className="font-mono text-3xl font-bold countdown-digits">{summary.active_tasks}</p>
                  </div>
                  <div className="flex flex-col gap-2 rounded-br-lg bg-background px-5 py-4">
                    <div className="flex items-center gap-1.5 text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span className="text-[11px] uppercase tracking-widest font-semibold">Overdue</span>
                    </div>
                    <p className="font-mono text-3xl font-bold countdown-digits text-destructive">{summary.overdue_tasks}</p>
                  </div>
                </div>
              </section>

              <Separator className="my-6 mx-6 md:mx-8 w-auto" />

              {/* Currency and time */}
              <section className="px-6 md:px-8">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Finance & Time
                </p>
                <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                  <StatBlock
                    label="Balance"
                    value={`Z ${summary.current_balance}`}
                    color="text-chart-2"
                  />
                  <StatBlock
                    label="Earned"
                    value={`+${summary.currency_earned}`}
                    sub="rupees"
                    color="text-success"
                  />
                  <StatBlock
                    label="Lost"
                    value={`-${summary.currency_lost}`}
                    sub="rupees"
                    color="text-destructive"
                  />
                  <StatBlock
                    label="Hours worked"
                    value={summary.total_hours_worked.toFixed(1)}
                    sub="hours total"
                    color="text-foreground"
                  />
                </div>
              </section>

              {daily.length > 0 && (
                <>
                  <Separator className="my-6 mx-6 md:mx-8 w-auto" />

                  {/* Daily breakdown */}
                  <section className="px-6 md:px-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Daily breakdown
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {daily.map((day) => (
                        <div
                          key={day.date}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(day.date).toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {day.sessions_count} session{day.sessions_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span className="font-mono text-sm countdown-digits">
                              {formatMinutes(day.total_minutes)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {weekly.length > 0 && (
                <>
                  <Separator className="my-6 mx-6 md:mx-8 w-auto" />

                  {/* Weekly breakdown */}
                  <section className="px-6 md:px-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Weekly breakdown
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {weekly.map((w) => (
                        <div
                          key={w.week}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              Week of {new Date(w.week).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {w.sessions_count} session{w.sessions_count !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" strokeWidth={1.5} />
                            <span className="font-mono text-sm countdown-digits">
                              {formatMinutes(w.total_minutes)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {tagAnalytics.length > 0 && (
                <>
                  <Separator className="my-6 mx-6 md:mx-8 w-auto" />

                  {/* Tag breakdown */}
                  <section className="px-6 md:px-8">
                    <div className="mb-3 flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        By tag
                      </p>
                    </div>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {tagAnalytics.map((t) => (
                        <div
                          key={t.tag_name}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: t.tag_color }}
                          />
                          <span className="flex-1 text-sm font-medium">{t.tag_name}</span>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <p className="font-mono text-sm countdown-digits">
                                {t.completed_count}/{t.task_count}
                              </p>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                done
                              </p>
                            </div>
                            <div>
                              <p className="font-mono text-sm countdown-digits">
                                {formatMinutes(t.total_minutes)}
                              </p>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                time
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}

              {habitAnalytics.length > 0 && (
                <>
                  <Separator className="my-6 mx-6 md:mx-8 w-auto" />

                  {/* Habit summary */}
                  <section className="px-6 md:px-8">
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Habits
                    </p>
                    <div className="divide-y divide-border rounded-lg border border-border">
                      {habitAnalytics.map((h) => (
                        <div
                          key={h.habit_name}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          <div
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ backgroundColor: h.habit_color }}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{h.habit_name}</p>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {h.cadence}
                            </p>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div className="flex items-center gap-1">
                              <Flame className="h-3.5 w-3.5 text-orange-400" strokeWidth={2} />
                              <span className="font-mono text-sm countdown-digits">
                                {h.current_streak}
                              </span>
                            </div>
                            <div>
                              <p className="font-mono text-sm countdown-digits">
                                {Math.round(h.completion_rate)}%
                              </p>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                rate
                              </p>
                            </div>
                            <div>
                              <p className="font-mono text-sm countdown-digits">
                                {h.total_completions}
                              </p>
                              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                check-ins
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {!summary && !error && (
            <div className="px-6 space-y-4 md:px-8">
              <div className="h-32 rounded-lg bg-secondary animate-pulse" />
              <div className="h-24 rounded-lg bg-secondary animate-pulse" />
              <div className="h-48 rounded-lg bg-secondary animate-pulse" />
            </div>
          )}

          <div className="h-8" />
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
