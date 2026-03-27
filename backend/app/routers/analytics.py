from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.users import current_active_user
from app.db.engine import get_async_session
from app.models.currency_transaction import CurrencyTransaction
from app.models.habit import Habit, HabitEntry
from app.models.tag import Tag
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.models.work_session import WorkSession

router = APIRouter(prefix="/analytics", tags=["analytics"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]


class AnalyticsSummary(BaseModel):
    total_tasks: int
    completed_tasks: int
    active_tasks: int
    overdue_tasks: int
    total_hours_worked: float
    currency_earned: int
    currency_lost: int
    current_balance: int


class DailyEntry(BaseModel):
    date: str
    sessions: int
    hours_worked: float


@router.get("/summary", response_model=AnalyticsSummary)
async def get_summary(session: SessionDep, user: UserDep) -> AnalyticsSummary:
    tasks_result = await session.execute(
        select(Task.status, func.count(Task.id)).where(Task.user_id == user.id).group_by(Task.status)
    )
    status_counts: dict[str, int] = {row[0]: row[1] for row in tasks_result.all()}

    total = sum(status_counts.values())
    completed = status_counts.get(TaskStatus.completed, 0)
    active = status_counts.get(TaskStatus.active, 0)
    overdue = status_counts.get(TaskStatus.overdue, 0)

    duration_result = await session.execute(
        select(func.sum(WorkSession.duration_seconds)).where(
            WorkSession.user_id == user.id, WorkSession.duration_seconds.is_not(None)
        )
    )
    total_seconds = duration_result.scalar() or 0

    earned_result = await session.execute(
        select(func.sum(CurrencyTransaction.amount)).where(
            CurrencyTransaction.user_id == user.id, CurrencyTransaction.amount > 0
        )
    )
    lost_result = await session.execute(
        select(func.sum(CurrencyTransaction.amount)).where(
            CurrencyTransaction.user_id == user.id, CurrencyTransaction.amount < 0
        )
    )

    db_user = await session.get(User, user.id)

    return AnalyticsSummary(
        total_tasks=total,
        completed_tasks=completed,
        active_tasks=active,
        overdue_tasks=overdue,
        total_hours_worked=round(total_seconds / 3600, 2),
        currency_earned=earned_result.scalar() or 0,
        currency_lost=abs(lost_result.scalar() or 0),
        current_balance=db_user.currency_balance if db_user else 0,
    )


@router.get("/daily", response_model=list[DailyEntry])
async def get_daily(session: SessionDep, user: UserDep) -> list[DailyEntry]:
    result = await session.execute(
        select(WorkSession).where(
            WorkSession.user_id == user.id, WorkSession.ended_at.is_not(None)
        )
    )
    sessions = result.scalars().all()

    daily: dict[str, dict] = {}
    for ws in sessions:
        started = ws.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        date_key = started.strftime("%Y-%m-%d")
        if date_key not in daily:
            daily[date_key] = {"sessions": 0, "seconds": 0}
        daily[date_key]["sessions"] += 1
        daily[date_key]["seconds"] += ws.duration_seconds or 0

    return [
        DailyEntry(
            date=date,
            sessions=data["sessions"],
            hours_worked=round(data["seconds"] / 3600, 2),
        )
        for date, data in sorted(daily.items(), reverse=True)
    ]


class WeeklyEntry(BaseModel):
    week: str
    sessions_count: int
    total_minutes: float


class TagAnalytics(BaseModel):
    tag_name: str
    tag_color: str
    task_count: int
    completed_count: int
    total_minutes: float


class HabitAnalytics(BaseModel):
    habit_name: str
    habit_color: str
    cadence: str
    current_streak: int
    total_completions: int
    completion_rate: float


@router.get("/weekly", response_model=list[WeeklyEntry])
async def get_weekly(session: SessionDep, user: UserDep) -> list[WeeklyEntry]:
    result = await session.execute(
        select(WorkSession).where(
            WorkSession.user_id == user.id, WorkSession.ended_at.is_not(None)
        )
    )
    sessions = result.scalars().all()

    weekly: dict[str, dict] = {}
    for ws in sessions:
        started = ws.started_at
        if started.tzinfo is None:
            started = started.replace(tzinfo=timezone.utc)
        iso_year, iso_week, _ = started.isocalendar()
        week_key = f"{iso_year}-W{iso_week:02d}"
        if week_key not in weekly:
            weekly[week_key] = {"sessions": 0, "seconds": 0}
        weekly[week_key]["sessions"] += 1
        weekly[week_key]["seconds"] += ws.duration_seconds or 0

    return [
        WeeklyEntry(
            week=week,
            sessions_count=data["sessions"],
            total_minutes=round(data["seconds"] / 60, 2),
        )
        for week, data in sorted(weekly.items(), reverse=True)
    ]


@router.get("/tags", response_model=list[TagAnalytics])
async def get_tag_analytics(session: SessionDep, user: UserDep) -> list[TagAnalytics]:
    tags_result = await session.execute(
        select(Tag)
        .where(Tag.user_id == user.id)
        .options(selectinload(Tag.tasks).selectinload(Task.work_sessions))
    )
    tags = tags_result.scalars().all()

    output: list[TagAnalytics] = []
    for tag in tags:
        task_count = len(tag.tasks)
        completed_count = sum(1 for t in tag.tasks if t.is_completed)
        total_seconds = sum(
            ws.duration_seconds or 0
            for t in tag.tasks
            for ws in t.work_sessions
            if ws.duration_seconds is not None
        )
        output.append(
            TagAnalytics(
                tag_name=tag.name,
                tag_color=tag.color,
                task_count=task_count,
                completed_count=completed_count,
                total_minutes=round(total_seconds / 60, 2),
            )
        )

    return output


@router.get("/habits", response_model=list[HabitAnalytics])
async def get_habit_analytics(session: SessionDep, user: UserDep) -> list[HabitAnalytics]:
    habits_result = await session.execute(
        select(Habit)
        .where(Habit.user_id == user.id, Habit.is_active == True)  # noqa: E712
        .options(selectinload(Habit.entries))
    )
    habits = habits_result.scalars().all()

    today = date.today()
    output: list[HabitAnalytics] = []

    for habit in habits:
        completed_entries = {e.date for e in habit.entries if e.completed}
        total_completions = len(completed_entries)

        streak = 0
        check = today
        while check in completed_entries:
            streak += 1
            check -= timedelta(days=1)

        days_since_created = max((today - habit.created_at.date()).days + 1, 1)
        completion_rate = round(total_completions / days_since_created, 4)

        output.append(
            HabitAnalytics(
                habit_name=habit.name,
                habit_color=habit.color,
                cadence=habit.cadence,
                current_streak=streak,
                total_completions=total_completions,
                completion_rate=completion_rate,
            )
        )

    return output
