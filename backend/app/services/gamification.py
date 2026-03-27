from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.currency_transaction import CurrencyTransaction, TransactionType
from app.models.task import Task
from app.models.user import User


def calculate_penalty(task: Task) -> int:
    if task.penalty_rate <= 0 or task.deadline is None:
        return 0
    now = datetime.now(timezone.utc)
    deadline = task.deadline
    if deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)
    if now <= deadline:
        return 0
    hours_overdue = (now - deadline).total_seconds() / 3600
    periods = int(hours_overdue / 12)
    return periods * task.penalty_rate


async def award_completion(session: AsyncSession, user: User, task: Task) -> int:
    if task.reward_amount <= 0:
        return 0
    user.currency_balance += task.reward_amount
    tx = CurrencyTransaction(
        user_id=user.id,
        amount=task.reward_amount,
        transaction_type=TransactionType.task_completion,
        task_id=task.id,
        description=f"Completed: {task.title}",
    )
    session.add(tx)
    return task.reward_amount


async def apply_penalty(session: AsyncSession, user: User, task: Task) -> int:
    penalty = calculate_penalty(task)
    if penalty <= 0:
        return 0
    actual_penalty = min(penalty, user.currency_balance)
    user.currency_balance -= actual_penalty
    tx = CurrencyTransaction(
        user_id=user.id,
        amount=-actual_penalty,
        transaction_type=TransactionType.deadline_penalty,
        task_id=task.id,
        description=f"Overdue penalty: {task.title}",
    )
    session.add(tx)
    return actual_penalty
