import uuid
from datetime import datetime, timedelta, timezone

from pydantic import BaseModel, Field, computed_field

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    notes: str | None = Field(default=None, max_length=10000)
    deadline: datetime
    priority: TaskPriority = TaskPriority.medium
    reward_amount: int = Field(default=0, ge=0, le=10000)
    penalty_rate: int = Field(default=0, ge=0, le=10000)
    tag_ids: list[uuid.UUID] = Field(default=[], max_length=20)


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    notes: str | None = Field(default=None, max_length=10000)
    deadline: datetime | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    reward_amount: int | None = Field(default=None, ge=0, le=10000)
    penalty_rate: int | None = Field(default=None, ge=0, le=10000)
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
    notes: str | None
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
