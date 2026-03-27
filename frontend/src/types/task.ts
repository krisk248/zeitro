export type TaskStatus = "active" | "paused" | "completed" | "overdue" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  deadline: string;
  status: TaskStatus;
  priority: TaskPriority;
  reward_amount: number;
  penalty_rate: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

export interface WorkSession {
  id: string;
  task_id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  session_type: "manual" | "pomodoro";
}

export interface CurrencyBalance {
  balance: number;
  total_earned: number;
  total_lost: number;
}

export interface Habit {
  id: string;
  name: string;
  color: string;
  cadence: "daily" | "weekly" | "monthly";
  reward_amount: number;
  is_active: boolean;
  created_at: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  date: string;
  completed: boolean;
}

export interface HabitHistoryEntry {
  date: string;
  completed: boolean;
}
