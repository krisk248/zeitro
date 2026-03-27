import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SessionType(str, enum.Enum):
    manual = "manual"
    pomodoro = "pomodoro"


class WorkSession(Base):
    __tablename__ = "work_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    session_type: Mapped[SessionType] = mapped_column(
        Enum(SessionType), nullable=False, default=SessionType.manual
    )
    pomodoro_duration: Mapped[int | None] = mapped_column(Integer, nullable=True)

    task: Mapped["Task"] = relationship("Task", back_populates="work_sessions")  # noqa: F821
