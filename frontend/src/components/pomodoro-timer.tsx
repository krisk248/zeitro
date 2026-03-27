"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { Play, Square, RotateCcw, Timer } from "lucide-react";
import { startSession, stopSession, getPomodoroStats } from "@/lib/api";
import type { PomodoroStats } from "@/lib/api";

// Ring geometry
const RING_SIZE = 120;
const STROKE_WIDTH = 6;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type TimerState = "idle" | "running" | "complete";

interface PomodoroTimerProps {
  taskId: string;
  isCompleted: boolean;
  onSessionStop?: () => void;
}

function padTwo(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatCountdownDisplay(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${padTwo(m)}:${padTwo(s)}`;
}

function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);

    oscillator.onended = () => ctx.close();
  } catch {
    // AudioContext not available (SSR or restricted env)
  }
}

export function PomodoroTimer({ taskId, isCompleted, onSessionStop }: PomodoroTimerProps) {
  const PRESETS = [25, 50] as const;

  const [selectedMinutes, setSelectedMinutes] = useState<number>(25);
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustom, setShowCustom] = useState<boolean>(false);

  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [remaining, setRemaining] = useState<number>(25 * 60);

  const [stats, setStats] = useState<PomodoroStats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCompletedRef = useRef<boolean>(false);

  const loadStats = useCallback(async () => {
    try {
      const s = await getPomodoroStats(taskId);
      setStats(s);
    } catch {
      // API not yet available
    }
  }, [taskId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function applyDuration(minutes: number) {
    const secs = minutes * 60;
    setSelectedMinutes(minutes);
    setTotalSeconds(secs);
    setRemaining(secs);
    setTimerState("idle");
    hasCompletedRef.current = false;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handlePresetClick(minutes: number) {
    setShowCustom(false);
    setCustomInput("");
    applyDuration(minutes);
  }

  function handleCustomToggle() {
    setShowCustom((v) => !v);
  }

  function handleCustomApply() {
    const parsed = parseInt(customInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 180) {
      applyDuration(parsed);
      setShowCustom(false);
    } else {
      toast.error("Enter a duration between 1 and 180 minutes");
    }
  }

  async function handleStart() {
    setLoading(true);
    try {
      await startSession(taskId, "pomodoro");
      hasCompletedRef.current = false;
      setTimerState("running");
      setRemaining(totalSeconds);

      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            // Timer hit zero — completion handled by effect below
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      toast.success("Pomodoro started");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setLoading(true);
    try {
      await stopSession(taskId);
      setTimerState("idle");
      setRemaining(totalSeconds);
      hasCompletedRef.current = false;
      onSessionStop?.();
      toast.success("Pomodoro stopped");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to stop session.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(totalSeconds);
    setTimerState("running");
    hasCompletedRef.current = false;

    // Restart countdown
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  }

  // Watch for natural completion
  useEffect(() => {
    if (timerState !== "running" || remaining > 0 || hasCompletedRef.current) return;

    hasCompletedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    async function handleComplete() {
      playBeep();
      setTimerState("complete");
      try {
        await stopSession(taskId);
        await loadStats();
        onSessionStop?.();
      } catch {
        // Session may have already been stopped
      }
      toast.success("Pomodoro complete! Take a break.", { duration: 6000 });
    }

    handleComplete();
  }, [remaining, timerState, taskId, loadStats, onSessionStop]);

  // Progress: 0 = full ring (start), 1 = empty (complete)
  const progress = totalSeconds > 0 ? (totalSeconds - remaining) / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  // Ring color
  let ringColor = "hsl(var(--muted-foreground))";
  if (timerState === "running") ringColor = "hsl(var(--primary))";
  if (timerState === "complete") ringColor = "hsl(var(--success))";

  return (
    <div className="space-y-5">
      {/* Duration selector — only when idle */}
      {timerState === "idle" && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Duration
          </p>
          <div className="flex items-center gap-2">
            {PRESETS.map((min) => (
              <button
                key={min}
                onClick={() => handlePresetClick(min)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedMinutes === min && !showCustom
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {min}m
              </button>
            ))}
            <button
              onClick={handleCustomToggle}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                showCustom
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom
            </button>
          </div>

          {showCustom && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={180}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomApply()}
                placeholder="minutes"
                className="w-24 rounded-md border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleCustomApply}
                className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Set
              </button>
            </div>
          )}
        </div>
      )}

      {/* Timer ring */}
      <div className="flex items-center gap-6">
        <div className="relative flex items-center justify-center" style={{ width: RING_SIZE, height: RING_SIZE }}>
          <svg
            width={RING_SIZE}
            height={RING_SIZE}
            viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
            aria-hidden="true"
            style={{ transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth={STROKE_WIDTH}
            />
            {/* Progress arc */}
            <circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              style={{ transition: timerState === "running" ? "stroke-dashoffset 1s linear, stroke 0.3s ease" : "stroke 0.3s ease" }}
            />
          </svg>

          {/* Center time */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`font-mono text-lg font-bold countdown-digits tabular-nums leading-none ${
                timerState === "complete"
                  ? "text-success"
                  : timerState === "running"
                    ? "text-foreground"
                    : "text-muted-foreground"
              }`}
            >
              {formatCountdownDisplay(remaining)}
            </span>
            {timerState === "complete" && (
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-success">
                Done
              </span>
            )}
            {timerState === "running" && (
              <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
                Focus
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-2">
          {timerState === "idle" && !isCompleted && (
            <button
              onClick={handleStart}
              disabled={loading}
              aria-label="Start pomodoro"
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95 ${loading ? "opacity-50" : ""}`}
            >
              <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
            </button>
          )}

          {timerState === "running" && (
            <>
              <button
                onClick={handleStop}
                disabled={loading}
                aria-label="Stop pomodoro"
                className={`flex h-10 w-10 items-center justify-center rounded-full bg-destructive text-destructive-foreground transition-all hover:bg-destructive/90 active:scale-95 ${loading ? "opacity-50" : ""}`}
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
              <button
                onClick={handleReset}
                disabled={loading}
                aria-label="Reset pomodoro"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-all hover:text-foreground active:scale-95"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}

          {timerState === "complete" && !isCompleted && (
            <button
              onClick={() => applyDuration(selectedMinutes)}
              aria-label="Start new pomodoro"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-all hover:bg-foreground/90 active:scale-95"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* State label */}
        <div className="flex flex-col gap-1">
          {timerState === "running" && (
            <div className="flex items-center gap-1.5 text-[11px] text-primary">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
              Recording
            </div>
          )}
          {timerState === "complete" && (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold text-success">Complete</p>
              <p className="text-[11px] text-muted-foreground">Take a 5m break</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            <span className="font-mono countdown-digits tabular-nums">{stats.total_pomodoros}</span>
            <span className="text-[11px]">pomodoros</span>
          </div>
          <span className="text-muted-foreground/40">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono countdown-digits tabular-nums">{stats.total_minutes}</span>
            <span className="text-[11px]">focus mins</span>
          </div>
        </div>
      )}
    </div>
  );
}
