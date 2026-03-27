# Zeitro - AI Coding Context

Use this file to understand the app before making changes. This is your guide for vibe coding with Claude, Cursor, or any AI assistant.

## What This App Does

Zeitro is a gamified countdown task tracker. Users create tasks with deadlines, see live T-minus countdowns, log work sessions, and earn/lose virtual currency based on completion.

## Architecture

Two separate services, one Docker Compose:

```
Browser -> Next.js (port 3000, UI only)
              |
          middleware proxies /api/* internally
              |
           FastAPI (port 8000, internal only)
              |
           SQLite (file on Docker volume)
```

- Frontend: Next.js 16 App Router, Server Components by default, client components where needed
- Backend: FastAPI with async SQLAlchemy, cookie-based JWT auth via fastapi-users
- Database: SQLite with WAL mode, migrations via Alembic
- Both containers share a Docker network, only port 3000 is exposed

## Backend Architecture

```
backend/app/
├── main.py              # FastAPI app, CORS, lifespan (SQLite PRAGMAs)
├── config.py            # pydantic-settings (DATABASE_URL, SECRET_KEY, etc.)
├── auth/
│   ├── users.py         # fastapi-users setup, cookie transport, JWT strategy
│   └── schemas.py       # UserRead, UserCreate, UserUpdate
├── db/
│   ├── base.py          # DeclarativeBase
│   └── engine.py        # async engine, session factory, get_async_session
├── models/
│   ├── user.py          # User (UUID, display_name, currency_balance, theme_preference)
│   ├── task.py          # Task (status enum, priority enum, deadline, reward, penalty, notes)
│   ├── tag.py           # Tag + task_tags M2M association
│   ├── work_session.py  # WorkSession (started_at, ended_at, duration, type)
│   ├── currency_transaction.py  # CurrencyTransaction (amount, type)
│   └── habit.py         # Habit + HabitEntry (daily check-ins)
├── schemas/             # Pydantic request/response models
├── routers/
│   ├── tasks.py         # CRUD + complete + check-penalties + duplicate
│   ├── sessions.py      # Start/stop work sessions + pomodoro stats
│   ├── tags.py          # Tag CRUD
│   ├── analytics.py     # Summary, daily, weekly, tags, habits
│   ├── habits.py        # Habit CRUD + check-in toggle + year history
│   ├── account.py       # Profile update, change password, export, delete account
│   └── stream.py        # SSE countdown (not yet consumed by frontend)
└── services/
    ├── gamification.py  # award_completion, apply_penalty, calculate_penalty
    └── penalty_worker.py # check_and_apply_penalties (bulk overdue check)
```

### Key Patterns

- All endpoints use `Annotated[AsyncSession, Depends(get_async_session)]` for DB access
- All endpoints use `Annotated[User, Depends(current_active_user)]` for auth
- Tasks always load with `selectinload(Task.tags)` to avoid lazy loading errors
- After mutations (create/update/complete), re-query with `get_task_or_404` instead of `session.refresh`
- Penalties: -N rupees per 12 hours overdue, capped at user's balance (never goes negative)

## Frontend Architecture

```
frontend/src/
├── app/
│   ├── layout.tsx         # Root layout, fonts, AuthProvider, Toaster
│   ├── page.tsx           # Dashboard (task list, search, filter, sort, penalty check)
│   ├── (auth)/
│   │   ├── layout.tsx     # Centered auth layout
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── tasks/[id]/page.tsx # Task detail (countdown, sessions, edit, complete, duplicate)
│   ├── analytics/page.tsx  # Stats, daily/weekly, tag breakdown, habit summary
│   ├── habits/page.tsx     # Habit tracker with year dot grid
│   └── settings/page.tsx   # Profile, password, export, delete account
├── components/
│   ├── ui/                # shadcn/ui components (owned, editable)
│   ├── countdown-card.tsx # List row with live countdown
│   ├── create-task-dialog.tsx # Create/edit task modal (with notes)
│   ├── work-session-tracker.tsx # Manual/Pomodoro mode toggle
│   ├── pomodoro-timer.tsx # Circular SVG progress ring with audio beep
│   ├── sidebar.tsx        # Desktop nav (icon rail, 5 items)
│   ├── bottom-nav.tsx     # Mobile nav (5 items)
│   ├── top-bar.tsx        # Header with currency + avatar + theme toggle
│   └── theme-toggle.tsx   # Dark/light mode (syncs to server)
├── lib/
│   ├── api.ts             # Typed API client (all endpoints)
│   ├── auth-context.tsx   # React context (user, login, register, logout)
│   ├── countdown.ts       # Time remaining calculation + formatting
│   └── utils.ts           # cn() utility
└── types/
    └── task.ts            # TypeScript interfaces
```

### Key Patterns

- API calls go through `lib/api.ts` which uses relative URLs (middleware proxies to backend)
- Auth uses cookie-based JWT, `credentials: "include"` on all fetch calls
- Countdown timers use `setInterval(1000)` on the client, not SSE
- Design: Linear/Vercel-inspired, zinc neutrals, Lucide icons, monospace numbers
- Toast notifications via sonner for all user actions
- Navigation via `useRouter` + `usePathname` for active states

## Design Language

- Dark mode default (zinc-based, not blue)
- List views over card grids
- Uppercase tracking labels (`text-[11px] font-semibold uppercase tracking-widest`)
- Monospace for numbers (`font-mono countdown-digits`)
- Color only for meaning: blue=active, amber=urgent, red=overdue, green=success
- Lucide icons, consistent 1.5 stroke weight
- No glassmorphism, no rounded-everything
- Inspired by: Linear, Vercel dashboard, Raycast

## Database Schema

- **user**: id (UUID), email, hashed_password, display_name, currency_balance, theme_preference, is_active
- **tasks**: id, user_id (FK), title, description, notes, deadline, status (active/paused/completed/overdue/cancelled), priority (low/medium/high/urgent), reward_amount, penalty_rate, is_completed, completed_at
- **tags**: id, user_id (FK), name, color
- **task_tags**: task_id, tag_id (M2M)
- **work_sessions**: id, task_id (FK), user_id (FK), started_at, ended_at, duration_seconds, session_type (manual/pomodoro), pomodoro_duration
- **currency_transactions**: id, user_id (FK), amount, transaction_type, task_id (FK), description
- **habits**: id, user_id (FK), name, color, cadence (daily/weekly/monthly), reward_amount, is_active
- **habit_entries**: id, habit_id (FK), date, completed (unique on habit_id+date)

## Commands

```bash
# Docker
docker compose up -d              # start
docker compose down               # stop
docker compose up -d --build      # rebuild
docker compose logs -f backend    # backend logs

# Backend dev
cd backend
uv run pytest tests/ -v           # run tests
uv run uvicorn app.main:app --reload  # dev server
uv run alembic revision --autogenerate -m "desc"  # new migration
uv run alembic upgrade head       # apply migrations

# Frontend dev
cd frontend
npm run dev                       # dev server
npm run build                     # production build
npx shadcn@latest add <component> # add UI component
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| DATABASE_URL | sqlite+aiosqlite:///./zeitro.db | SQLAlchemy connection string |
| SECRET_KEY | (auto-generated) | JWT signing secret |
| CORS_ORIGINS | ["http://localhost:3000"] | Allowed origins |
| INTERNAL_API_URL | http://backend:8000 | Backend URL (Docker internal) |
| ZEITRO_PORT | 3000 | Exposed port |

## Testing

75 unit tests across 9 test files:
- `test_auth.py` - register, login, logout, unauthorized, welcome bonus
- `test_tasks.py` - CRUD, complete, double complete, filters, unauthorized
- `test_task_enhancements.py` - notes, duplicate, duplicate with tags
- `test_sessions.py` - start, stop, active session, conflicts
- `test_pomodoro.py` - pomodoro sessions, stats, duration persistence
- `test_tags.py` - CRUD, task-tag association, unauthorized
- `test_penalties.py` - overdue detection, 12-hour intervals, completed skip
- `test_habits.py` - CRUD, check-in, toggle, history, unauthorized
- `test_analytics_v2.py` - weekly, tags, habits analytics
- `test_account.py` - profile update, change password, export, delete account

Run with: `cd backend && uv run pytest tests/ -v`
