import uuid
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, computed_field

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    deadline: datetime
    priority: TaskPriority = TaskPriority.medium
    reward_amount: int = 0
    penalty_rate: int = 0
    tag_ids: list[uuid.UUID] = []


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    reward_amount: int | None = None
    penalty_rate: int | None = None
    tag_ids: list[uuid.UUID] | None = None


class TagInTask(BaseModel):
    id: uuid.UUID
    name: str
    color: str

    model_config = {"from_attributes": True}


class TaskRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str | None
    deadline: datetime
    status: TaskStatus
    priority: TaskPriority
    reward_amount: int
    penalty_rate: int
    is_completed: bool
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    tags: list[TagInTask] = []

    @computed_field
    @property
    def time_remaining(self) -> timedelta | None:
        if self.is_completed:
            return None
        now = datetime.now(timezone.utc)
        deadline = self.deadline
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        remaining = deadline - now
        return remaining if remaining.total_seconds() > 0 else timedelta(0)

    model_config = {"from_attributes": True}
