import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class HabitCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    color: str = Field(default="#6366f1", pattern=r"^#[0-9a-fA-F]{6}$")
    cadence: Literal["daily", "weekly", "monthly"] = "daily"
    reward_amount: int = Field(default=1, ge=0, le=1000)


class HabitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    cadence: Literal["daily", "weekly", "monthly"] | None = None
    reward_amount: int | None = Field(default=None, ge=0, le=1000)
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
