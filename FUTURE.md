# Zeitro - Future Development Roadmap

## Phase 15 - Goals & Aims
Links tasks and habits to long-term objectives.

- Long-term goals (3-month, 6-month, yearly)
- Each goal links to multiple tasks and habits
- Progress percentage based on linked task/habit completion
- Milestone markers
- Goal review prompts (weekly: "Are you on track?")

**Why:** Implementation intentions research (Gollwitzer, 1999) shows people who write specific goals with deadlines are 2-3x more likely to achieve them. Goals are the parent layer above tasks and habits.

## Phase 16 - Daily Reflection / Journal
Evening reflection and mood tracking.

- Evening prompt: "What went well? What didn't? What will I do tomorrow?"
- Link to tasks completed that day
- Mood tracking (1-5 scale)
- Searchable journal history
- Markdown support for entries

**Why:** A 2023 meta-analysis in Psychological Bulletin found expressive writing for 15 min/day reduced anxiety by 26% and improved goal achievement by 22%.

## Phase 17 - Sleep Tracking
Manual sleep logging with productivity correlation.

- Log bedtime + wake time (manual, not wearable)
- Auto-calculate sleep duration
- Sleep quality rating (1-5)
- Correlate with task completion rate ("On 7+ hour nights you completed 82% of tasks vs 54% on <6h")
- Sleep consistency score (regularity of schedule)

**Why:** Sleep is the single biggest predictor of next-day productivity. A 2024 Nature study showed <6h sleep = 40% fewer tasks completed the next day.

## Phase 18 - Weekly Review Dashboard
Auto-generated weekly summary from existing data.

- Triggered every Sunday or on-demand
- Tasks completed vs planned
- Hours worked per tag
- Habit completion rate for the week
- Currency earned/lost
- Sleep average (once Phase 17 is done)
- One-screen "state of your life" view

**Why:** The weekly review from GTD (Getting Things Done) is the most impactful productivity practice. Only 8% of people do it consistently. Auto-generating it removes the friction.

## Phase 19 - Focus Score
Single daily composite metric (0-100) combining all signals.

- Tasks completed vs planned
- Pomodoro sessions done
- Habit check-ins completed
- Sleep quality (once available)
- No overdue tasks bonus
- Streak bonuses
- Displayed prominently on dashboard

**Why:** Gamification research shows a single composite score is more motivating than tracking 10 separate metrics. One number to optimize.

## Phase 20 - Expense Tracking
Simple daily expense logging with budget awareness.

- Quick-add expense: amount + category + note
- Daily/weekly/monthly totals
- Category breakdown (food, transport, subscriptions, etc.)
- Budget targets per category with progress bars
- Burn rate: spending velocity relative to monthly budget
- No bank integrations - manual logging only

**Why:** Same loss aversion psychology as Zeitro's currency system. Seeing real-time spend creates awareness. Kept simple and manual to avoid financial data security complexity.

## Design Principles for All Future Phases

- Everything stays in Zeitro - one app, one login, one morning dashboard
- Each new data stream makes analytics more powerful through correlation
- Minimal input friction - if it takes more than 10 seconds to log, people stop doing it
- Auto-generate insights where possible (weekly review, focus score, sleep correlation)
- Same design language: Linear/Vercel-inspired, zinc neutrals, monospace numbers
