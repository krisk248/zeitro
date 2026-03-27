import uuid
from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.users import current_active_user
from app.db.engine import get_async_session
from app.models.currency_transaction import CurrencyTransaction, TransactionType
from app.models.habit import Habit, HabitEntry
from app.models.user import User
from app.schemas.habit import HabitCreate, HabitEntryRead, HabitHistory, HabitHistoryEntry, HabitRead, HabitUpdate

router = APIRouter(prefix="/habits", tags=["habits"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]


async def get_habit_or_404(habit_id: uuid.UUID, user: User, session: AsyncSession) -> Habit:
    result = await session.execute(
        select(Habit).where(Habit.id == habit_id, Habit.user_id == user.id)
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit


@router.get("", response_model=list[HabitRead])
async def list_habits(
    session: SessionDep,
    user: UserDep,
    include_inactive: bool = Query(default=False),
) -> list[Habit]:
    q = select(Habit).where(Habit.user_id == user.id)
    if not include_inactive:
        q = q.where(Habit.is_active == True)  # noqa: E712
    result = await session.execute(q.order_by(Habit.created_at))
    return list(result.scalars().all())


@router.post("", response_model=HabitRead, status_code=201)
async def create_habit(body: HabitCreate, session: SessionDep, user: UserDep) -> Habit:
    habit = Habit(
        user_id=user.id,
        name=body.name,
        color=body.color,
        cadence=body.cadence,
        reward_amount=body.reward_amount,
    )
    session.add(habit)
    await session.commit()
    await session.refresh(habit)
    return habit


@router.patch("/{habit_id}", response_model=HabitRead)
async def update_habit(
    habit_id: uuid.UUID, body: HabitUpdate, session: SessionDep, user: UserDep
) -> Habit:
    habit = await get_habit_or_404(habit_id, user, session)
    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(habit, field, value)
    await session.commit()
    await session.refresh(habit)
    return habit


@router.delete("/{habit_id}", status_code=204)
async def delete_habit(habit_id: uuid.UUID, session: SessionDep, user: UserDep) -> None:
    habit = await get_habit_or_404(habit_id, user, session)
    await session.delete(habit)
    await session.commit()


@router.post("/{habit_id}/check", response_model=HabitEntryRead)
async def check_habit(habit_id: uuid.UUID, session: SessionDep, user: UserDep) -> HabitEntry:
    habit = await get_habit_or_404(habit_id, user, session)
    today = date.today()

    existing_result = await session.execute(
        select(HabitEntry).where(
            HabitEntry.habit_id == habit_id,
            HabitEntry.date == today,
        )
    )
    existing = existing_result.scalar_one_or_none()

    db_user = await session.get(User, user.id)

    if existing:
        existing.completed = not existing.completed
        if existing.completed:
            db_user.currency_balance += habit.reward_amount
            tx = CurrencyTransaction(
                user_id=user.id,
                amount=habit.reward_amount,
                transaction_type=TransactionType.bonus,
                description=f"Habit check-in: {habit.name}",
            )
            session.add(tx)
        else:
            deduction = min(habit.reward_amount, db_user.currency_balance)
            db_user.currency_balance -= deduction
            tx = CurrencyTransaction(
                user_id=user.id,
                amount=-deduction,
                transaction_type=TransactionType.manual_adjustment,
                description=f"Habit unchecked: {habit.name}",
            )
            session.add(tx)
        await session.commit()
        await session.refresh(existing)
        return existing

    entry = HabitEntry(
        habit_id=habit_id,
        date=today,
        completed=True,
    )
    session.add(entry)
    db_user.currency_balance += habit.reward_amount
    tx = CurrencyTransaction(
        user_id=user.id,
        amount=habit.reward_amount,
        transaction_type=TransactionType.bonus,
        description=f"Habit check-in: {habit.name}",
    )
    session.add(tx)
    await session.commit()
    await session.refresh(entry)
    return entry


@router.get("/{habit_id}/history", response_model=HabitHistory)
async def get_habit_history(
    habit_id: uuid.UUID,
    session: SessionDep,
    user: UserDep,
    year: int = Query(default=None),
) -> HabitHistory:
    await get_habit_or_404(habit_id, user, session)

    if year is None:
        year = datetime.now(timezone.utc).year

    from datetime import timedelta

    start = date(year, 1, 1)
    end = date(year, 12, 31)

    result = await session.execute(
        select(HabitEntry).where(
            HabitEntry.habit_id == habit_id,
            HabitEntry.date >= start,
            HabitEntry.date <= end,
        )
    )
    entries_in_db = {e.date: e.completed for e in result.scalars().all()}

    all_days: list[HabitHistoryEntry] = []
    current = start
    while current <= end:
        all_days.append(
            HabitHistoryEntry(
                date=current.isoformat(),
                completed=entries_in_db.get(current, False),
            )
        )
        current += timedelta(days=1)

    return HabitHistory(entries=all_days)
