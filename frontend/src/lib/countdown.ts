export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total_seconds: number;
  is_overdue: boolean;
}

export function calculateTimeRemaining(deadline: string): TimeRemaining {
  const now = Date.now();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff <= 0) {
    const absDiff = Math.abs(diff);
    const totalSeconds = Math.floor(absDiff / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      total_seconds: totalSeconds,
      is_overdue: true,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    total_seconds: totalSeconds,
    is_overdue: false,
  };
}

export function formatCountdown(time: TimeRemaining): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const prefix = time.is_overdue ? "+" : "T-";

  if (time.days > 0) {
    return `${prefix} ${time.days}d ${pad(time.hours)}h ${pad(time.minutes)}m ${pad(time.seconds)}s`;
  }
  if (time.hours > 0) {
    return `${prefix} ${pad(time.hours)}h ${pad(time.minutes)}m ${pad(time.seconds)}s`;
  }
  return `${prefix} ${pad(time.minutes)}m ${pad(time.seconds)}s`;
}
