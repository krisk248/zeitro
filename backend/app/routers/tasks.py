import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth.users import current_active_user
from app.db.engine import get_async_session
from app.models.tag import Tag
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate
from app.services.gamification import award_completion
from app.services.penalty_worker import check_and_apply_penalties

router = APIRouter(prefix="/tasks", tags=["tasks"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]


async def get_task_or_404(task_id: uuid.UUID, user: User, session: AsyncSession) -> Task:
    result = await session.execute(
        select(Task)
        .where(Task.id == task_id, Task.user_id == user.id)
        .options(selectinload(Task.tags))
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    session: SessionDep,
    user: UserDep,
    status: TaskStatus | None = Query(default=None),
    priority: TaskPriority | None = Query(default=None),
    tag_id: uuid.UUID | None = Query(default=None),
) -> list[Task]:
    now = datetime.now(timezone.utc)
    overdue_q = select(Task).where(
        Task.user_id == user.id,
        Task.status == TaskStatus.active,
        Task.is_completed == False,  # noqa: E712
        Task.deadline < now,
    )
    overdue_result = await session.execute(overdue_q)
    stale_tasks = overdue_result.scalars().all()
    if stale_tasks:
        for t in stale_tasks:
            t.status = TaskStatus.overdue
            t.updated_at = now
        await session.commit()

    q = select(Task).where(Task.user_id == user.id).options(selectinload(Task.tags))
    if status:
        q = q.where(Task.status == status)
    if priority:
        q = q.where(Task.priority == priority)
    if tag_id:
        q = q.where(Task.tags.any(Tag.id == tag_id))
    result = await session.execute(q.order_by(Task.deadline))
    return list(result.scalars().all())


@router.post("/check-penalties", response_model=dict)
async def check_penalties(session: SessionDep, user: UserDep) -> dict:
    count = await check_and_apply_penalties(session)
    return {"penalties_applied": count}


@router.post("", response_model=TaskRead, status_code=201)
async def create_task(body: TaskCreate, session: SessionDep, user: UserDep) -> Task:
    task = Task(
        user_id=user.id,
        title=body.title,
        description=body.description,
        deadline=body.deadline,
        priority=body.priority,
        reward_amount=body.reward_amount,
        penalty_rate=body.penalty_rate,
    )
    if body.tag_ids:
        tags_result = await session.execute(
            select(Tag).where(Tag.id.in_(body.tag_ids), Tag.user_id == user.id)
        )
        task.tags = list(tags_result.scalars().all())
    session.add(task)
    await session.commit()
    return await get_task_or_404(task.id, user, session)


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(task_id: uuid.UUID, session: SessionDep, user: UserDep) -> Task:
    return await get_task_or_404(task_id, user, session)


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: uuid.UUID, body: TaskUpdate, session: SessionDep, user: UserDep
) -> Task:
    task = await get_task_or_404(task_id, user, session)
    update_data = body.model_dump(exclude_unset=True, exclude={"tag_ids"})
    for field, value in update_data.items():
        setattr(task, field, value)
    if body.tag_ids is not None:
        tags_result = await session.execute(
            select(Tag).where(Tag.id.in_(body.tag_ids), Tag.user_id == user.id)
        )
        task.tags = list(tags_result.scalars().all())
    task.updated_at = datetime.now(timezone.utc)
    await session.commit()
    return await get_task_or_404(task.id, user, session)


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: uuid.UUID, session: SessionDep, user: UserDep) -> None:
    task = await get_task_or_404(task_id, user, session)
    await session.delete(task)
    await session.commit()


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(task_id: uuid.UUID, session: SessionDep, user: UserDep) -> Task:
    task = await get_task_or_404(task_id, user, session)
    if task.is_completed:
        raise HTTPException(status_code=400, detail="Task already completed")
    task.is_completed = True
    task.status = TaskStatus.completed
    task.completed_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)

    db_user = await session.get(User, user.id)
    await award_completion(session, db_user, task)

    await session.commit()
    return await get_task_or_404(task.id, user, session)
