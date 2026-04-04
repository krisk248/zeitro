# Zeitro

> **Zeit** *(German: time)* + **Hero** *(English)* = **Zeitro** — *become the hero of your own time.*

A gamified countdown task tracker that weaponizes Parkinson's Law against itself.

## Why Zeitro Exists

### Parkinson's Law

> *"Work expands so as to fill the time available for its completion."*
> — C. Northcote Parkinson, 1955

Give yourself a week to write a report that takes two hours, and you'll spend the full week on it. The task doesn't get better — it just takes longer. You overthink, procrastinate, and fill the extra time with low-value work.

This isn't laziness. It's how the human brain works. Without a visible, ticking constraint, there's no urgency signal. Your brain treats distant deadlines as abstract — *"I still have time"* — until suddenly you don't.

### The T-Minus Solution

Most task managers show deadlines as static dates. **"Due Friday"** feels the same on Monday and Thursday until panic hits.

Zeitro flips this. Every task has a **live T-minus countdown** ticking backwards in real time. Watching `T- 1d 23h 04m 30s` shrink creates urgency that a calendar date never will. This exploits several cognitive mechanisms:

| Mechanism | How Zeitro Uses It |
|---|---|
| **Loss aversion** | Watching time disappear triggers the same response as losing money. You act faster when something is being taken away. |
| **Zeigarnik effect** | Unfinished tasks with visible countdowns create mental tension. Your brain wants to close the loop. |
| **Temporal discounting** | A live counter saying `T- 2d 23h 59m 42s` makes "3 days" feel real instead of abstract. |
| **Gamification** | Earning virtual currency for completing tasks and losing it for missing deadlines adds stakes. Even fake money triggers dopamine. |
| **Parkinson's counter** | A visible countdown compresses perceived time. You can't expand work to fill the time when you can see the time shrinking. |

### How Zeitro Fights Parkinson's Law

1. **Live countdown, not static dates** — Every task shows a T-minus timer ticking in real time. "Due Friday" becomes `T- 2d 14h 30m 12s` — and it's shrinking.
2. **Financial stakes (even fake ones)** — Earn rupees for completing tasks on time. Lose them every 12 hours when overdue. Fake stakes, real motivation.
3. **Visible work logging** — Hit play when you work, stop when you pause. See exactly how many hours you've invested — making sunk cost work in your favor.
4. **Tighter feedback loops** — Habits get daily check-ins. Tasks get countdowns. Analytics show patterns. The shorter the loop, the harder it is for Parkinson's Law to operate.
5. **Pomodoro focus blocks** — 25-minute sprints with a visible circular timer. You can't expand work to fill the time when the time is 25 minutes and counting.

This isn't a theory project. It's a tool built to solve a personal problem: finishing things on time.

## Features

- **Live T-minus countdown** — Every task shows a ticking countdown to deadline
- **Work session logging** — Open a task card, hit play to track time spent working
- **Pomodoro timer** — Circular progress ring, 25/50/custom minute focus sessions with audio alert
- **Gamification** — Earn rupees for completing tasks, lose rupees for missing deadlines
- **Penalty system** — Overdue tasks auto-deduct currency every 12 hours
- **Habit tracking** — Daily/weekly/monthly habits with GitHub-style year dot grid heatmap
- **Analytics** — Task stats, hours worked, currency flow, tag breakdown, weekly view, habit streaks
- **Task notes** — Add notes to any task
- **Search, filter, sort** — Find tasks by title, filter by status, sort by deadline/priority/created
- **Duplicate tasks** — Clone any task with one click
- **Tags** — Categorize tasks with colored labels
- **Settings** — Edit profile, change password, export data, delete account
- **Auth** — User accounts with JWT cookie-based authentication
- **Dark/light mode** — Toggle between themes, preference saved to server
- **Grid & list view** — Toggle between card grid and compact list on dashboard
- **PWA** — Installable on Android and desktop, works offline for cached data
- **Responsive** — Works on desktop, tablet, and mobile
- **API-first** — Full REST API, frontend is decoupled from backend
- **Dockerized** — Single `docker compose up` runs everything

- **Habit backfill** — Click past dates in the dot grid to mark as done (with late penalty)
- **Missed habit penalties** — Auto-deduct currency for missed daily habits

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | SvelteKit 5 (Svelte 5 runes) |
| UI | Tailwind CSS v4, Lucide-svelte, sonner-svelte |
| Backend | Python FastAPI, Uvicorn |
| Database | SQLite + WAL mode |
| ORM | SQLAlchemy 2.0 async + aiosqlite |
| Auth | fastapi-users (JWT cookies) |
| Containerization | Docker Compose |

## Getting Started

### Prerequisites

- Docker and Docker Compose v2
- Git

### Quick Start (Docker)

```bash
git clone https://github.com/krisk248/zeitro.git
cd zeitro
docker compose up -d
```

Open http://localhost:3000, create an account, start tracking.

To use a different port:
```bash
ZEITRO_PORT=4000 docker compose up -d
```

### Local Development (without Docker)

#### Backend

```bash
cd backend
uv sync                                    # install dependencies
uv run alembic upgrade head                # create database
uv run uvicorn app.main:app --reload       # start API on :8000
```

#### Frontend (SvelteKit)

```bash
cd frontend-svelte
npm install                                # install dependencies
INTERNAL_API_URL=http://localhost:8000 npm run dev  # start on :5173
```

### Running Tests

```bash
cd backend
uv run pytest tests/ -v                    # 80 tests
```

## Project Structure

```
zeitro/
├── backend/                    # FastAPI application
│   ├── app/
│   │   ├── auth/               # Authentication (fastapi-users)
│   │   ├── db/                 # Database engine, base model
│   │   ├── models/             # SQLAlchemy models
│   │   ├── routers/            # API endpoints
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── services/           # Business logic (gamification, penalties)
│   ├── alembic/                # Database migrations
│   ├── tests/                  # pytest test suite
│   └── Dockerfile
├── frontend-svelte/            # SvelteKit application (primary)
│   ├── src/
│   │   ├── routes/             # Pages (dashboard, auth, analytics, habits, settings, task detail, about)
│   │   ├── lib/components/     # UI components
│   │   ├── lib/                # API client, auth store, utilities
│   │   └── hooks.server.ts     # API proxy
│   └── Dockerfile
├── frontend/                   # Next.js application (frozen, legacy)
├── docker-compose.yml          # Container orchestration
├── design.md                   # Design system tokens and guidelines
└── CONTEXT.md                  # AI coding context (for vibe coding)
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/auth/register | Create account |
| POST | /api/v1/auth/login | Login (sets cookie) |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/users/me | Current user profile |
| GET | /api/v1/tasks | List tasks (filterable) |
| POST | /api/v1/tasks | Create task |
| GET | /api/v1/tasks/:id | Get task detail |
| PATCH | /api/v1/tasks/:id | Update task |
| DELETE | /api/v1/tasks/:id | Delete task |
| POST | /api/v1/tasks/:id/complete | Mark complete (earns rupees) |
| POST | /api/v1/tasks/:id/sessions/start | Start work session |
| POST | /api/v1/tasks/:id/sessions/stop | Stop work session |
| GET | /api/v1/tasks/:id/sessions | List sessions |
| GET | /api/v1/sessions/active | Get active session |
| POST | /api/v1/tasks/check-penalties | Apply overdue penalties |
| GET | /api/v1/tags | List tags |
| POST | /api/v1/tags | Create tag |
| DELETE | /api/v1/tags/:id | Delete tag |
| POST | /api/v1/tasks/:id/duplicate | Duplicate task |
| GET | /api/v1/tasks/:id/pomodoro-stats | Pomodoro stats for task |
| GET | /api/v1/analytics/summary | Productivity stats |
| GET | /api/v1/analytics/daily | Daily breakdown |
| GET | /api/v1/analytics/weekly | Weekly breakdown |
| GET | /api/v1/analytics/tags | Time per tag |
| GET | /api/v1/analytics/habits | Habit completion stats |
| GET | /api/v1/habits | List habits |
| POST | /api/v1/habits | Create habit |
| PATCH | /api/v1/habits/:id | Update habit |
| DELETE | /api/v1/habits/:id | Delete habit |
| POST | /api/v1/habits/:id/check | Toggle daily check-in |
| GET | /api/v1/habits/:id/history | Year dot grid data |
| PATCH | /api/v1/account/profile | Update display name / theme |
| POST | /api/v1/account/change-password | Change password |
| GET | /api/v1/account/export | Export all user data |
| DELETE | /api/v1/account | Delete account |
| POST | /api/v1/habits/check-missed | Apply missed habit penalties |

## Roadmap

### Done
- [x] Live T-minus countdown cards
- [x] Task CRUD with tags, priorities, and notes
- [x] Task search, filter by status, sort by deadline/priority/created
- [x] Task duplicate
- [x] Grid and list view toggle
- [x] Work session time tracking (manual + pomodoro)
- [x] Pomodoro timer with circular progress ring and audio alert
- [x] Gamification (earn/lose virtual currency)
- [x] Auto-penalty for overdue tasks (every 12 hours)
- [x] Habit tracking with daily/weekly/monthly cadence
- [x] Year dot grid heatmap (GitHub-style) for habits
- [x] Habit streaks and backfill past dates with late penalty
- [x] Missed habit penalties (auto-deduct for yesterday)
- [x] Analytics dashboard (summary, daily, weekly, tag breakdown, habit stats)
- [x] Auth (login/signup/logout, registration toggle)
- [x] Settings (profile, tags, change password, export data, delete account)
- [x] About page (Parkinson's Law, Zeitro etymology)
- [x] Dark/light mode (server-persisted preference)
- [x] Toast notifications for all actions
- [x] PWA (installable on Android and desktop)
- [x] Docker containerization
- [x] SvelteKit frontend rewrite (migrated from Next.js)
- [x] Security hardening (rate limiting, input validation, CSRF)
- [x] GitHub Actions CI/CD (GHCR images)
- [x] 80 unit tests + E2E suite

### Planned
- [ ] Goals & Aims (link tasks/habits to long-term goals)
- [ ] Daily journal with mood tracking
- [ ] Sleep tracking with productivity correlation
- [ ] Weekly review auto-generated dashboard
- [ ] Focus score (daily composite metric)
- [ ] Expense tracking
- [ ] Recurring tasks
- [ ] Push notifications for approaching deadlines

## Contributing

See [CONTEXT.md](CONTEXT.md) for architecture details and coding conventions to get started.

## License

MIT
