import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.work_session import SessionType


class WorkSessionCreate(BaseModel):
    session_type: SessionType = SessionType.manual
    pomodoro_duration: int | None = None


class WorkSessionEnd(BaseModel):
    pass


class WorkSessionRead(BaseModel):
    id: uuid.UUID
    task_id: uuid.UUID
    user_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    session_type: SessionType
    pomodoro_duration: int | None

    model_config = {"from_attributes": True}


class PomodoroStats(BaseModel):
    total_pomodoros: int
    total_minutes: int
    average_duration: float
