import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class HabitCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    cadence: Literal["daily", "weekly", "monthly"] = "daily"
    reward_amount: int = 1


class HabitUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    cadence: Literal["daily", "weekly", "monthly"] | None = None
    reward_amount: int | None = None
    is_active: bool | None = None


class HabitRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    color: str
    cadence: str
    reward_amount: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class HabitEntryRead(BaseModel):
    id: uuid.UUID
    habit_id: uuid.UUID
    date: date
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class HabitHistoryEntry(BaseModel):
    date: str
    completed: bool


class HabitHistory(BaseModel):
    entries: list[HabitHistoryEntry]
