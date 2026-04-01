"use client";

import { useEffect, useState } from "react";
import { Circle, Check, Clock, Coins, Flame } from "lucide-react";
import { calculateTimeRemaining, formatCountdown, type TimeRemaining } from "@/lib/countdown";
import type { Task } from "@/types/task";

function getStatusIndicator(status: Task["status"], time: TimeRemaining) {
  if (status === "completed") return <Check className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />;
  if (status === "paused") return <Circle className="h-3 w-3 text-muted-foreground" />;
  if (time.is_overdue) return <Flame className="h-3.5 w-3.5 text-destructive animate-pulse" />;
  if (time.total_seconds < 3600) return <Clock className="h-3.5 w-3.5 text-warning animate-pulse" />;
  return <div className="h-2 w-2 rounded-full bg-chart-1" />;
}

function getCountdownStyle(status: Task["status"], time: TimeRemaining) {
  if (status === "completed") return "text-muted-foreground line-through decoration-success/50";
  if (time.is_overdue) return "text-destructive";
  if (time.total_seconds < 3600) return "text-warning";
  if (time.total_seconds < 86400) return "text-chart-2";
  return "text-foreground";
}

function getRowAccent(status: Task["status"], time: TimeRemaining) {
  if (status === "completed") return "opacity-50";
  if (time.is_overdue) return "border-l-2 border-l-destructive";
  if (time.total_seconds < 3600) return "border-l-2 border-l-warning";
  return "";
}

function getCardBorder(status: Task["status"], time: TimeRemaining) {
  if (status === "completed") return "border-success/20 opacity-60";
  if (time.is_overdue) return "border-destructive/30";
  if (time.total_seconds < 3600) return "border-warning/30";
  if (time.total_seconds < 86400) return "border-chart-2/20";
  return "border-border";
}

interface CountdownCardProps {
  task: Task;
  variant?: "list" | "grid";
  onOpen?: (taskId: string) => void;
}

export function CountdownCard({ task, variant = "list", onOpen }: CountdownCardProps) {
  const [time, setTime] = useState<TimeRemaining>(() => calculateTimeRemaining(task.deadline));

  useEffect(() => {
    if (task.status === "completed" || task.status === "cancelled") return;
    const interval = setInterval(() => {
      setTime(calculateTimeRemaining(task.deadline));
    }, 1000);
    return () => clearInterval(interval);
  }, [task.deadline, task.status]);

  const countdown = formatCountdown(time);

  if (variant === "grid") {
    return (
      <button
        onClick={() => onOpen?.(task.id)}
        className={`group flex flex-col rounded-lg border p-4 text-left transition-all hover:bg-secondary/30 hover:scale-[1.01] ${getCardBorder(task.status, time)}`}
      >
        {/* Top row: status + priority */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-5 w-5 items-center justify-center">
            {getStatusIndicator(task.status, time)}
          </div>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
            task.priority === "urgent"
              ? "bg-destructive/10 text-destructive"
              : task.priority === "high"
                ? "bg-warning/10 text-warning"
                : "bg-secondary text-muted-foreground"
          }`}>
            {task.priority}
          </span>
        </div>

        {/* Title */}
        <h3 className={`text-sm font-medium leading-snug mb-2 line-clamp-2 ${task.status === "completed" ? "text-muted-foreground" : "text-foreground"}`}>
          {task.title}
        </h3>

        {/* Countdown - prominent */}
        <div className={`font-mono text-xl font-bold countdown-digits mb-3 ${getCountdownStyle(task.status, time)}`}>
          {task.status === "completed" ? "done" : countdown}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
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
        )}

        {/* Bottom: deadline + reward */}
        <div className="mt-auto flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            {new Date(task.deadline).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
          <span className="flex items-center gap-0.5">
            <Coins className="h-3 w-3" />
            {task.reward_amount}
          </span>
        </div>
      </button>
    );
  }

  // List variant (default)
  return (
    <button
      onClick={() => onOpen?.(task.id)}
      className={`group flex w-full items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-secondary/50 ${getRowAccent(task.status, time)}`}
    >
      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
        {getStatusIndicator(task.status, time)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-[13px] font-medium ${task.status === "completed" ? "text-muted-foreground" : "text-foreground"}`}>
            {task.title}
          </span>
          {task.tags.map((tag) => (
            <span
              key={tag.id}
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${tag.color}15`, color: tag.color }}
            >
              {tag.name}
            </span>
          ))}
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>
            {new Date(task.deadline).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          <span className="flex items-center gap-0.5">
            <Coins className="h-3 w-3" />
            {task.reward_amount}
          </span>
        </div>
      </div>

      <span className={`hidden shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider sm:inline-block ${
        task.priority === "urgent"
          ? "bg-destructive/10 text-destructive"
          : task.priority === "high"
            ? "bg-warning/10 text-warning"
            : "bg-secondary text-muted-foreground"
      }`}>
        {task.priority}
      </span>

      <div className={`shrink-0 font-mono text-sm font-semibold countdown-digits ${getCountdownStyle(task.status, time)}`}>
        {task.status === "completed" ? "done" : countdown}
      </div>

      <svg
        className="h-4 w-4 shrink-0 text-muted-foreground/0 transition-all group-hover:text-muted-foreground group-hover:translate-x-0.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}
