import asyncio
import json
from datetime import datetime, timezone
from typing import Annotated, AsyncGenerator

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.auth.users import current_active_user
from app.db.engine import get_async_session
from app.models.task import Task, TaskStatus
from app.models.user import User

router = APIRouter(prefix="/stream", tags=["stream"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]


@router.get("/countdown")
async def countdown_stream(session: SessionDep, user: UserDep) -> EventSourceResponse:
    async def event_generator() -> AsyncGenerator[dict, None]:
        while True:
            result = await session.execute(
                select(Task).where(
                    Task.user_id == user.id,
                    Task.status.in_([TaskStatus.active, TaskStatus.paused]),
                    Task.is_completed.is_(False),
                )
            )
            tasks = result.scalars().all()
            now = datetime.now(timezone.utc)
            payload = []
            for task in tasks:
                deadline = task.deadline
                if deadline.tzinfo is None:
                    deadline = deadline.replace(tzinfo=timezone.utc)
                remaining = (deadline - now).total_seconds()
                payload.append(
                    {
                        "id": str(task.id),
                        "title": task.title,
                        "deadline": deadline.isoformat(),
                        "remaining_seconds": max(0, int(remaining)),
                        "is_overdue": remaining < 0,
                        "status": task.status,
                    }
                )
            yield {"data": json.dumps(payload)}
            await asyncio.sleep(1)

    return EventSourceResponse(event_generator())
