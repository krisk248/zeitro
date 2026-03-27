"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Play, Square, Clock } from "lucide-react";
import { startSession, stopSession, getActiveSession, getTaskSessions } from "@/lib/api";
import type { WorkSession } from "@/types/task";

interface WorkSessionTrackerProps {
  taskId: string;
  isCompleted: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  return `${pad(m)}m ${pad(s)}s`;
}

export function WorkSessionTracker({ taskId, isCompleted }: WorkSessionTrackerProps) {
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadSessions() {
    try {
      const [active, history] = await Promise.all([
        getActiveSession(),
        getTaskSessions(taskId),
      ]);
      if (active && active.task_id === taskId) {
        setActiveSession(active);
      }
      setSessions(history);
    } catch {
      // API not available
    }
  }

  useEffect(() => {
    loadSessions();
  }, [taskId]);

  // Tick elapsed time for active session
  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }
    const start = new Date(activeSession.started_at).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  async function handleStart() {
    setLoading(true);
    try {
      const ws = await startSession(taskId);
      setActiveSession(ws);
      toast.success("Session started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    try {
      await stopSession(taskId);
      setActiveSession(null);
      await loadSessions();
      toast.success("Session stopped");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop session.");
    } finally {
      setLoading(false);
    }
  }

  const totalSeconds = sessions
    .filter((s) => s.duration_seconds != null)
    .reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0);

  const isActive = activeSession !== null;

  return (
    <div className="space-y-4">
      {/* Timer display */}
      <div className="rounded-lg border border-border bg-secondary/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {isActive ? "Working" : "Session"}
            </p>
            <p className={`mt-1 font-mono text-3xl font-bold countdown-digits ${isActive ? "text-success" : "text-foreground"}`}>
              {isActive ? formatDuration(elapsed) : "00m 00s"}
            </p>
          </div>

          {!isCompleted && (
            <button
              onClick={isActive ? handleStop : handleStart}
              disabled={loading}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all active:scale-95 ${
                isActive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-foreground text-background hover:bg-foreground/90"
              } ${loading ? "opacity-50" : ""}`}
            >
              {isActive ? (
                <Square className="h-5 w-5" fill="currentColor" />
              ) : (
                <Play className="h-5 w-5 ml-0.5" fill="currentColor" />
              )}
            </button>
          )}
        </div>

        {isActive && (
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-success">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Recording work session
          </div>
        )}
      </div>

      {/* Session stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono countdown-digits">{formatDuration(totalSeconds + (isActive ? elapsed : 0))}</span>
          <span className="text-[11px]">total</span>
        </div>
        <span className="text-muted-foreground/50">|</span>
        <span className="text-[11px] text-muted-foreground">
          {sessions.filter((s) => s.duration_seconds != null).length} sessions
        </span>
      </div>

      {/* Session history */}
      {sessions.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            History
          </p>
          <div className="space-y-0.5">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary/50">
                <span>
                  {new Date(s.started_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  {new Date(s.started_at).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="font-mono countdown-digits">
                  {s.duration_seconds != null
                    ? formatDuration(s.duration_seconds)
                    : "in progress"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
