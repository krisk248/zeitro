import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskStatus
from app.models.user import User
from app.services.gamification import apply_penalty


async def check_and_apply_penalties(session: AsyncSession, user_id: uuid.UUID) -> int:
    now = datetime.now(timezone.utc)

    result = await session.execute(
        select(Task).where(
            Task.user_id == user_id,
            Task.status == TaskStatus.active,
            Task.is_completed == False,  # noqa: E712
            Task.deadline < now,
        )
    )
    overdue_tasks = result.scalars().all()

    count = 0
    for task in overdue_tasks:
        task.status = TaskStatus.overdue
        task.updated_at = now

        db_user = await session.get(User, task.user_id)
        if db_user is not None:
            penalty = await apply_penalty(session, db_user, task)
            if penalty > 0:
                count += 1

    if overdue_tasks:
        await session.commit()

    return count
