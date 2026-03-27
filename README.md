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

## MVP Features

- **Live T-minus countdown** — Every task shows a ticking countdown to deadline
- **Work session logging** — Open a task card, hit play to track time spent working
- **Gamification** — Earn rupees for completing tasks, lose rupees for missing deadlines
- **Penalty system** — Overdue tasks auto-deduct currency every 12 hours
- **Analytics** — Total tasks, hours worked, currency earned/lost
- **Tags** — Categorize tasks with colored labels
- **Auth** — User accounts with JWT cookie-based authentication
- **Dark/light mode** — Toggle between themes
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
uv run pytest tests/ -v                    # 39 tests
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
│   │   ├── app/                # Pages (dashboard, auth, analytics, task detail)
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
| GET | /api/v1/analytics/summary | Productivity stats |
| GET | /api/v1/analytics/daily | Daily breakdown |

## Roadmap

### Done
- [x] Live T-minus countdown cards
- [x] Task CRUD with tags and priorities
- [x] Work session time tracking
- [x] Gamification (earn/lose virtual currency)
- [x] Auto-penalty for overdue tasks
- [x] Analytics dashboard
- [x] Auth (login/signup/logout)
- [x] Dark/light mode
- [x] Docker containerization
- [x] 39 unit tests + E2E suite

### Planned
- [ ] Pomodoro timer (25/5 focus mode)
- [ ] Recurring tasks
- [ ] Notes per task (rich text)
- [ ] PWA (installable on phone)
- [ ] Streak tracking
- [ ] Sound/vibration alerts
- [ ] Data export (CSV/JSON)
- [ ] Settings page
- [ ] Task search and filtering UI
- [ ] Currency transaction history

## Contributing

See [CONTEXT.md](CONTEXT.md) for architecture details and coding conventions to get started.

## License

MIT
