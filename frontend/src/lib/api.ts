const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
    ...init,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: "GET" });
  },
  post<T>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });
  },
  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },
  delete<T>(path: string, init: RequestInit = {}): Promise<T> {
    return request<T>(path, { method: "DELETE", ...init });
  },
};

export { ApiError };

// Auth
export interface UserMe {
  id: string;
  email: string;
  display_name: string;
  currency_balance: number;
  theme_preference: string;
}

export async function login(email: string, password: string): Promise<UserMe> {
  const form = new URLSearchParams();
  form.set("username", email);
  form.set("password", password);
  form.set("grant_type", "password");
  await request<unknown>("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  return getMe();
}

export async function register(
  email: string,
  password: string,
  display_name: string,
): Promise<UserMe> {
  await api.post<unknown>("/api/v1/auth/register", { email, password, display_name });
  return login(email, password);
}

export function logout(): Promise<void> {
  return api.post<void>("/api/v1/auth/logout");
}

export function getMe(): Promise<UserMe> {
  return api.get<UserMe>("/api/v1/users/me");
}

// Account
export interface UpdateProfileData {
  display_name?: string;
  theme_preference?: string;
}

export function updateProfile(data: UpdateProfileData): Promise<UserMe> {
  return api.patch<UserMe>("/api/v1/account/profile", data);
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.post<void>("/api/v1/account/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export function exportData(): Promise<unknown> {
  return api.get<unknown>("/api/v1/account/export");
}

export function deleteAccount(password: string): Promise<void> {
  return api.delete<void>("/api/v1/account", {
    body: JSON.stringify({ password }),
  });
}

// Tasks
import type { Task, TaskPriority, Tag } from "@/types/task";

export interface CreateTaskData {
  title: string;
  description?: string;
  notes?: string;
  deadline: string;
  priority: TaskPriority;
  reward_amount: number;
  penalty_rate: number;
  tag_ids?: string[];
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export function getTasks(): Promise<Task[]> {
  return api.get<Task[]>("/api/v1/tasks");
}

export function createTask(data: CreateTaskData): Promise<Task> {
  return api.post<Task>("/api/v1/tasks", data);
}

export function updateTask(id: string, data: UpdateTaskData): Promise<Task> {
  return api.patch<Task>(`/api/v1/tasks/${id}`, data);
}

export function deleteTask(id: string): Promise<void> {
  return api.delete<void>(`/api/v1/tasks/${id}`);
}

export function completeTask(id: string): Promise<Task> {
  return api.post<Task>(`/api/v1/tasks/${id}/complete`);
}

export function duplicateTask(id: string): Promise<Task> {
  return api.post<Task>(`/api/v1/tasks/${id}/duplicate`);
}

// Sessions
import type { WorkSession } from "@/types/task";

export function startSession(taskId: string, sessionType: "manual" | "pomodoro" = "manual"): Promise<WorkSession> {
  return api.post<WorkSession>(`/api/v1/tasks/${taskId}/sessions/start`, { session_type: sessionType });
}

export function stopSession(taskId: string): Promise<WorkSession> {
  return api.post<WorkSession>(`/api/v1/tasks/${taskId}/sessions/stop`);
}

export function getActiveSession(): Promise<WorkSession | null> {
  return api.get<WorkSession | null>("/api/v1/sessions/active");
}

export function getTaskSessions(taskId: string): Promise<WorkSession[]> {
  return api.get<WorkSession[]>(`/api/v1/tasks/${taskId}/sessions`);
}

// Tags
export function getTags(): Promise<Tag[]> {
  return api.get<Tag[]>("/api/v1/tags");
}

export function createTag(name: string, color: string): Promise<Tag> {
  return api.post<Tag>("/api/v1/tags", { name, color });
}

export function updateTag(id: string, data: { name?: string; color?: string }): Promise<Tag> {
  return api.patch<Tag>(`/api/v1/tags/${id}`, data);
}

export function deleteTag(id: string): Promise<void> {
  return api.delete<void>(`/api/v1/tags/${id}`);
}

// Penalties
export interface CheckPenaltiesResult {
  penalties_applied: number;
}

export function checkPenalties(): Promise<CheckPenaltiesResult> {
  return api.post<CheckPenaltiesResult>("/api/v1/tasks/check-penalties");
}

// Analytics
export interface AnalyticsSummary {
  total_tasks: number;
  completed_tasks: number;
  active_tasks: number;
  overdue_tasks: number;
  total_hours_worked: number;
  currency_earned: number;
  currency_lost: number;
  current_balance: number;
}

export interface DailyAnalytics {
  date: string;
  sessions_count: number;
  total_minutes: number;
}

export function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  return api.get<AnalyticsSummary>("/api/v1/analytics/summary");
}

export function getDailyAnalytics(): Promise<DailyAnalytics[]> {
  return api.get<DailyAnalytics[]>("/api/v1/analytics/daily");
}

// Habits
import type { Habit, HabitEntry, HabitHistoryEntry } from "@/types/task";

export interface CreateHabitData {
  name: string;
  color?: string;
  cadence?: "daily" | "weekly" | "monthly";
  reward_amount?: number;
}

export function getHabits(): Promise<Habit[]> {
  return api.get<Habit[]>("/api/v1/habits");
}

export function createHabit(data: CreateHabitData): Promise<Habit> {
  return api.post<Habit>("/api/v1/habits", data);
}

export function updateHabit(id: string, data: Partial<CreateHabitData>): Promise<Habit> {
  return api.patch<Habit>(`/api/v1/habits/${id}`, data);
}

export function deleteHabit(id: string): Promise<void> {
  return api.delete<void>(`/api/v1/habits/${id}`);
}

function getLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function checkInHabit(id: string): Promise<HabitEntry> {
  return api.post<HabitEntry>(`/api/v1/habits/${id}/check?client_date=${getLocalDateStr()}`);
}

export interface MissedHabitsResult {
  total_penalty: number;
  details: { habit: string; missed_days: number; penalty: number }[];
}

export function checkMissedHabits(): Promise<MissedHabitsResult> {
  return api.post<MissedHabitsResult>(`/api/v1/habits/check-missed?client_date=${getLocalDateStr()}`);
}

export async function getHabitHistory(id: string, year: number): Promise<HabitHistoryEntry[]> {
  const data = await api.get<{ entries: HabitHistoryEntry[] }>(`/api/v1/habits/${id}/history?year=${year}`);
  return data.entries;
}

// Analytics V2
export interface WeeklyAnalytics {
  week: string;
  sessions_count: number;
  total_minutes: number;
}

export interface TagAnalytics {
  tag_name: string;
  tag_color: string;
  task_count: number;
  completed_count: number;
  total_minutes: number;
}

export interface HabitAnalytics {
  habit_name: string;
  habit_color: string;
  cadence: string;
  current_streak: number;
  total_completions: number;
  completion_rate: number;
}

export function getWeeklyAnalytics(): Promise<WeeklyAnalytics[]> {
  return api.get<WeeklyAnalytics[]>("/api/v1/analytics/weekly");
}

export function getTagAnalytics(): Promise<TagAnalytics[]> {
  return api.get<TagAnalytics[]>("/api/v1/analytics/tags");
}

export function getHabitAnalytics(): Promise<HabitAnalytics[]> {
  return api.get<HabitAnalytics[]>("/api/v1/analytics/habits");
}

// Pomodoro
export interface PomodoroStats {
  total_pomodoros: number;
  total_minutes: number;
  average_duration: number;
}

export function getPomodoroStats(taskId: string): Promise<PomodoroStats> {
  return api.get<PomodoroStats>(`/api/v1/tasks/${taskId}/pomodoro-stats`);
}
