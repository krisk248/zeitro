import asyncio
import json
from datetime import datetime, timezone
from typing import Annotated, AsyncGenerator

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sse_starlette.sse import EventSourceResponse

from app.auth.users import current_active_user
from app.db.engine import async_session_maker
from app.models.task import Task, TaskStatus
from app.models.user import User

router = APIRouter(prefix="/stream", tags=["stream"])

UserDep = Annotated[User, Depends(current_active_user)]

MAX_STREAM_DURATION = 300


@router.get("/countdown")
async def countdown_stream(request: Request, user: UserDep) -> EventSourceResponse:
    user_id = user.id

    async def event_generator() -> AsyncGenerator[dict, None]:
        elapsed = 0
        while elapsed < MAX_STREAM_DURATION:
            if await request.is_disconnected():
                break

            async with async_session_maker() as session:
                result = await session.execute(
                    select(Task).where(
                        Task.user_id == user_id,
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
            elapsed += 1

    return EventSourceResponse(event_generator())
