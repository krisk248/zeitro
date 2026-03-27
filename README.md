# Zeitro

A gamified countdown task tracker that uses T-minus psychology to drive task completion.

## The Idea

Most task managers show deadlines as static dates. Zeitro flips this — every task has a **live T-minus countdown** ticking backwards in real time. Watching `T- 1d 23h 04m 30s` shrink creates urgency that a calendar date never will.

### Why T-Minus Works

The countdown timer exploits several cognitive biases that make us better at finishing things:

- **Loss aversion** — Watching time disappear triggers the same response as losing money. You act faster when something is being taken away than when something is being offered.
- **Zeigarnik effect** — Unfinished tasks with visible countdowns create mental tension. Your brain wants to close the loop.
- **Temporal discounting** — We underestimate future deadlines ("I have 3 days"). A live counter saying `T- 2d 23h 59m 42s` makes "3 days" feel real.
- **Gamification** — Earning virtual currency for completing tasks and losing it for missing deadlines adds stakes. Even fake money triggers dopamine.

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
- **Responsive** — Works on desktop, tablet, and mobile
- **API-first** — Full REST API, frontend is decoupled from backend
- **Dockerized** — Single `docker compose up` runs everything

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19 |
| UI | shadcn/ui, Tailwind CSS v4, Lucide icons |
| Backend | Python FastAPI, Uvicorn |
| Database | SQLite + WAL mode |
| ORM | SQLAlchemy 2.0 async + aiosqlite |
| Auth | fastapi-users (JWT cookies) |
| Real-time | Server-Sent Events |
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

#### Frontend

```bash
cd frontend
npm install                                # install dependencies
npm run dev                                # start on :3000
```

Create a `.env.local` in `frontend/`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Running Tests

```bash
cd backend
uv run pytest tests/ -v                    # 75 tests
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
├── frontend/                   # Next.js application
│   ├── src/
│   │   ├── app/                # Pages (dashboard, auth, analytics, habits, settings, task detail)
│   │   ├── components/         # UI components
│   │   ├── lib/                # API client, auth context, utilities
│   │   └── types/              # TypeScript types
│   └── Dockerfile
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

## Roadmap

### Done
- [x] Live T-minus countdown cards
- [x] Task CRUD with tags, priorities, and notes
- [x] Task search, filter by status, sort by deadline/priority/created
- [x] Task duplicate
- [x] Work session time tracking (manual + pomodoro)
- [x] Pomodoro timer with circular progress ring and audio alert
- [x] Gamification (earn/lose virtual currency)
- [x] Auto-penalty for overdue tasks (every 12 hours)
- [x] Habit tracking with daily/weekly/monthly cadence
- [x] Year dot grid heatmap (GitHub-style) for habits
- [x] Habit streaks
- [x] Analytics dashboard (summary, daily, weekly, tag breakdown, habit stats)
- [x] Auth (login/signup/logout)
- [x] Settings (profile, change password, export data, delete account)
- [x] Dark/light mode (server-persisted preference)
- [x] Toast notifications for all actions
- [x] Docker containerization
- [x] 75 unit tests + E2E suite

### Planned
- [ ] Recurring tasks
- [ ] PWA (installable on phone)
- [ ] Push notifications for approaching deadlines
- [ ] Achievement badges and streaks for tasks
- [ ] Currency transaction history view
- [ ] Data visualization charts
- [ ] Team/shared tasks (SaaS prep)

## Contributing

See [CONTEXT.md](CONTEXT.md) for architecture details and coding conventions to get started.

## License

MIT
