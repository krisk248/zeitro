import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.users import current_active_user
from app.db.engine import get_async_session
from app.models.task import Task
from app.models.user import User
from app.models.work_session import WorkSession
from app.schemas.work_session import PomodoroStats, WorkSessionCreate, WorkSessionRead

router = APIRouter(tags=["sessions"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]


@router.post("/tasks/{task_id}/sessions/start", response_model=WorkSessionRead, status_code=201)
async def start_session(
    task_id: uuid.UUID, body: WorkSessionCreate, session: SessionDep, user: UserDep
) -> WorkSession:
    task_result = await session.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user.id)
    )
    task = task_result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    active_result = await session.execute(
        select(WorkSession).where(
            WorkSession.user_id == user.id, WorkSession.ended_at.is_(None)
        )
    )
    if active_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A session is already active")

    ws = WorkSession(
        task_id=task_id,
        user_id=user.id,
        session_type=body.session_type,
        pomodoro_duration=body.pomodoro_duration,
        started_at=datetime.now(timezone.utc),
    )
    session.add(ws)
    await session.commit()
    await session.refresh(ws)
    return ws


@router.post("/tasks/{task_id}/sessions/stop", response_model=WorkSessionRead)
async def stop_session(task_id: uuid.UUID, session: SessionDep, user: UserDep) -> WorkSession:
    result = await session.execute(
        select(WorkSession).where(
            WorkSession.task_id == task_id,
            WorkSession.user_id == user.id,
            WorkSession.ended_at.is_(None),
        )
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="No active session for this task")

    now = datetime.now(timezone.utc)
    ws.ended_at = now
    started = ws.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    ws.duration_seconds = int((now - started).total_seconds())
    await session.commit()
    await session.refresh(ws)
    return ws


@router.get("/tasks/{task_id}/sessions", response_model=list[WorkSessionRead])
async def list_task_sessions(
    task_id: uuid.UUID, session: SessionDep, user: UserDep
) -> list[WorkSession]:
    result = await session.execute(
        select(WorkSession)
        .where(WorkSession.task_id == task_id, WorkSession.user_id == user.id)
        .order_by(WorkSession.started_at.desc())
    )
    return list(result.scalars().all())


@router.get("/sessions/active", response_model=WorkSessionRead | None)
async def get_active_session(session: SessionDep, user: UserDep) -> WorkSession | None:
    result = await session.execute(
        select(WorkSession).where(
            WorkSession.user_id == user.id, WorkSession.ended_at.is_(None)
        )
    )
    return result.scalar_one_or_none()


@router.get("/tasks/{task_id}/pomodoro-stats", response_model=PomodoroStats)
async def get_pomodoro_stats(
    task_id: uuid.UUID, session: SessionDep, user: UserDep
) -> PomodoroStats:
    task_result = await session.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user.id)
    )
    if not task_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Task not found")

    result = await session.execute(
        select(
            func.count(WorkSession.id),
            func.coalesce(func.sum(WorkSession.duration_seconds), 0),
            func.coalesce(func.avg(WorkSession.duration_seconds), 0.0),
        ).where(
            WorkSession.task_id == task_id,
            WorkSession.user_id == user.id,
            WorkSession.session_type == "pomodoro",
            WorkSession.ended_at.is_not(None),
        )
    )
    row = result.one()
    total_pomodoros = row[0]
    total_seconds = row[1]
    avg_seconds = row[2]

    return PomodoroStats(
        total_pomodoros=total_pomodoros,
        total_minutes=int(total_seconds) // 60,
        average_duration=round(float(avg_seconds), 2),
    )
