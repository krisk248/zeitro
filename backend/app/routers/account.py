from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.schemas import UserRead
from app.auth.users import current_active_user, get_user_manager, UserManager
from app.db.engine import get_async_session
from app.models.currency_transaction import CurrencyTransaction
from app.models.task import Task
from app.models.user import User
from app.models.work_session import WorkSession

router = APIRouter(prefix="/account", tags=["account"])

SessionDep = Annotated[AsyncSession, Depends(get_async_session)]
UserDep = Annotated[User, Depends(current_active_user)]
UserManagerDep = Annotated[UserManager, Depends(get_user_manager)]


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    theme_preference: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    password: str


@router.patch("/profile", response_model=UserRead)
async def update_profile(
    body: ProfileUpdate,
    session: SessionDep,
    user: UserDep,
):
    if body.theme_preference is not None and body.theme_preference not in ("dark", "light"):
        raise HTTPException(status_code=400, detail="theme_preference must be 'dark' or 'light'")

    user_obj = await session.get(User, user.id)
    if body.display_name is not None:
        user_obj.display_name = body.display_name
    if body.theme_preference is not None:
        user_obj.theme_preference = body.theme_preference

    session.add(user_obj)
    await session.commit()
    await session.refresh(user_obj)
    return user_obj


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    user: UserDep,
    user_manager: UserManagerDep,
):
    credentials = type(
        "_Credentials",
        (),
        {"username": user.email, "password": body.current_password},
    )()
    authenticated = await user_manager.authenticate(credentials=credentials)
    if authenticated is None:
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    hashed = user_manager.password_helper.hash(body.new_password)
    await user_manager._update(user, {"hashed_password": hashed})
    return {"detail": "Password updated successfully"}


@router.get("/export")
async def export_data(
    session: SessionDep,
    user: UserDep,
):
    tasks_result = await session.execute(
        select(Task).where(Task.user_id == user.id)
    )
    tasks = tasks_result.scalars().all()

    sessions_result = await session.execute(
        select(WorkSession).where(WorkSession.user_id == user.id)
    )
    work_sessions = sessions_result.scalars().all()

    transactions_result = await session.execute(
        select(CurrencyTransaction).where(CurrencyTransaction.user_id == user.id)
    )
    transactions = transactions_result.scalars().all()

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "display_name": user.display_name,
            "currency_balance": user.currency_balance,
            "theme_preference": user.theme_preference,
            "created_at": user.created_at.isoformat(),
        },
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "description": t.description,
                "status": t.status,
                "priority": t.priority,
                "deadline": t.deadline.isoformat(),
                "reward_amount": t.reward_amount,
                "penalty_rate": t.penalty_rate,
                "is_completed": t.is_completed,
                "completed_at": t.completed_at.isoformat() if t.completed_at else None,
                "created_at": t.created_at.isoformat(),
            }
            for t in tasks
        ],
        "work_sessions": [
            {
                "id": str(s.id),
                "task_id": str(s.task_id),
                "started_at": s.started_at.isoformat(),
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "duration_seconds": s.duration_seconds,
                "session_type": s.session_type,
            }
            for s in work_sessions
        ],
        "currency_transactions": [
            {
                "id": str(tx.id),
                "amount": tx.amount,
                "transaction_type": tx.transaction_type,
                "description": tx.description,
                "created_at": tx.created_at.isoformat(),
            }
            for tx in transactions
        ],
    }


@router.delete("", status_code=204)
async def delete_account(
    body: DeleteAccountRequest,
    session: SessionDep,
    user: UserDep,
    user_manager: UserManagerDep,
):
    credentials = type(
        "_Credentials",
        (),
        {"username": user.email, "password": body.password},
    )()
    authenticated = await user_manager.authenticate(credentials=credentials)
    if authenticated is None:
        raise HTTPException(status_code=400, detail="Password is incorrect")

    user_obj = await session.get(User, user.id)
    await session.delete(user_obj)
    await session.commit()
    return Response(status_code=204)
