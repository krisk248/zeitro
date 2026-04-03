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
async def check_habit(
    habit_id: uuid.UUID,
    session: SessionDep,
    user: UserDep,
    client_date: str | None = Query(default=None, description="Client's local date YYYY-MM-DD"),
) -> HabitEntry:
    habit = await get_habit_or_404(habit_id, user, session)

    today = date.today()
    target_date = today
    if client_date:
        try:
            target_date = date.fromisoformat(client_date)
        except ValueError:
            target_date = today

    # Block future dates
    if target_date > today:
        raise HTTPException(status_code=400, detail="Cannot check in for a future date.")

    is_past = target_date < today

    existing_result = await session.execute(
        select(HabitEntry).where(
            HabitEntry.habit_id == habit_id,
            HabitEntry.date == target_date,
        )
    )
    existing = existing_result.scalar_one_or_none()

    db_user = await session.get(User, user.id)

    # Past date that's already checked - no toggle allowed
    if existing and existing.completed and is_past:
        return existing

    if existing:
        # Toggle only allowed for today
        if is_past:
            raise HTTPException(status_code=400, detail="Cannot uncheck a past date.")
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

    # New entry
    entry = HabitEntry(
        habit_id=habit_id,
        date=target_date,
        completed=True,
    )
    session.add(entry)

    if is_past:
        # Late backfill: charge penalty (reward_amount as late fee)
        penalty = min(habit.reward_amount, db_user.currency_balance)
        if penalty > 0:
            db_user.currency_balance -= penalty
            tx = CurrencyTransaction(
                user_id=user.id,
                amount=-penalty,
                transaction_type=TransactionType.manual_adjustment,
                description=f"Late backfill ({target_date}): {habit.name}",
            )
            session.add(tx)
    else:
        # Today: normal reward
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


@router.post("/check-missed")
async def check_missed_habits(
    session: SessionDep,
    user: UserDep,
    client_date: str | None = Query(default=None),
) -> dict:
    if client_date:
        try:
            today = date.fromisoformat(client_date)
        except ValueError:
            today = date.today()
    else:
        today = date.today()

    from datetime import timedelta

    habits_result = await session.execute(
        select(Habit).where(Habit.user_id == user.id, Habit.is_active == True)  # noqa: E712
    )
    habits = habits_result.scalars().all()

    # Check if we already ran penalties today by looking for a transaction
    existing_penalty = await session.execute(
        select(CurrencyTransaction).where(
            CurrencyTransaction.user_id == user.id,
            CurrencyTransaction.description.like("Missed %"),
            CurrencyTransaction.created_at >= datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc),
        )
    )
    if existing_penalty.scalar_one_or_none():
        return {"total_penalty": 0, "details": []}

    db_user = await session.get(User, user.id)
    total_penalty = 0
    missed_details = []

    for habit in habits:
        if habit.cadence != "daily":
            continue

        entries_result = await session.execute(
            select(HabitEntry.date).where(
                HabitEntry.habit_id == habit.id,
                HabitEntry.completed == True,  # noqa: E712
            )
        )
        completed_dates = {row[0] for row in entries_result.all()}

        habit_start = habit.created_at.date() if habit.created_at else today
        yesterday = today - timedelta(days=1)
        # Only check yesterday (not a 7-day window that re-penalizes)
        if yesterday >= habit_start and yesterday not in completed_dates:
            penalty = habit.reward_amount
            actual = min(penalty, db_user.currency_balance)
            if actual > 0:
                db_user.currency_balance -= actual
                tx = CurrencyTransaction(
                    user_id=user.id,
                    amount=-actual,
                    transaction_type=TransactionType.manual_adjustment,
                    description=f"Missed yesterday: {habit.name}",
                )
                session.add(tx)
                total_penalty += actual
                missed_details.append({"habit": habit.name, "missed_days": 1, "penalty": actual})

    if total_penalty > 0:
        await session.commit()

    return {"total_penalty": total_penalty, "details": missed_details}


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
