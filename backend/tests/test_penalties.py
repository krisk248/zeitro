import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.models.task import Task, TaskStatus
from app.models.user import User
from tests.conftest import TestSessionLocal


async def _set_task_deadline_past(task_id: str, hours_ago: float = 25.0):
    tid = uuid.UUID(task_id)
    async with TestSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.id == tid))
        task = result.scalar_one_or_none()
        if task:
            task.deadline = datetime.now(timezone.utc) - timedelta(hours=hours_ago)
            await session.commit()


async def _get_task_status(task_id: str) -> str | None:
    tid = uuid.UUID(task_id)
    async with TestSessionLocal() as session:
        result = await session.execute(select(Task).where(Task.id == tid))
        task = result.scalar_one_or_none()
        return task.status if task else None


async def _get_user_balance(email: str) -> int:
    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        return user.currency_balance if user else 0


@pytest.mark.asyncio
async def test_overdue_task_status_updated_on_list(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Penalty Status Task",
            "deadline": "2026-04-01T12:00:00Z",
            "priority": "medium",
            "reward_amount": 0,
            "penalty_rate": 0,
        },
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    await _set_task_deadline_past(task_id, hours_ago=25.0)

    list_resp = await auth_client.get("/api/v1/tasks")
    assert list_resp.status_code == 200

    status = await _get_task_status(task_id)
    assert status == TaskStatus.overdue


@pytest.mark.asyncio
async def test_check_penalties_endpoint_returns_count(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Penalty Apply Task",
            "deadline": "2026-04-01T12:00:00Z",
            "priority": "high",
            "reward_amount": 100,
            "penalty_rate": 5,
        },
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    await auth_client.post(f"/api/v1/tasks/{task_id}/complete")

    resp2 = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Overdue Penalty Task",
            "deadline": "2026-04-01T12:00:00Z",
            "priority": "high",
            "reward_amount": 0,
            "penalty_rate": 5,
        },
    )
    assert resp2.status_code == 201
    overdue_id = resp2.json()["id"]

    await _set_task_deadline_past(overdue_id, hours_ago=25.0)

    penalty_resp = await auth_client.post("/api/v1/tasks/check-penalties")
    assert penalty_resp.status_code == 200
    data = penalty_resp.json()
    assert "penalties_applied" in data
    assert data["penalties_applied"] >= 1


@pytest.mark.asyncio
async def test_completed_tasks_not_penalized(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Already Done Task",
            "deadline": "2026-04-01T12:00:00Z",
            "priority": "low",
            "reward_amount": 50,
            "penalty_rate": 10,
        },
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    await auth_client.post(f"/api/v1/tasks/{task_id}/complete")

    await _set_task_deadline_past(task_id, hours_ago=25.0)

    balance_before = await _get_user_balance("test@zeitro.com")

    penalty_resp = await auth_client.post("/api/v1/tasks/check-penalties")
    assert penalty_resp.status_code == 200

    balance_after = await _get_user_balance("test@zeitro.com")
    assert balance_after == balance_before

    status = await _get_task_status(task_id)
    assert status == TaskStatus.completed


@pytest.mark.asyncio
async def test_penalty_calculation_12_hour_intervals(auth_client: AsyncClient):
    async with TestSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "test@zeitro.com"))
        user = result.scalar_one_or_none()
        if user:
            user.currency_balance = 1000
            await session.commit()

    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Interval Penalty Task",
            "deadline": "2026-04-01T12:00:00Z",
            "priority": "urgent",
            "reward_amount": 0,
            "penalty_rate": 10,
        },
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    await _set_task_deadline_past(task_id, hours_ago=13.0)

    balance_before = await _get_user_balance("test@zeitro.com")

    penalty_resp = await auth_client.post("/api/v1/tasks/check-penalties")
    assert penalty_resp.status_code == 200

    balance_after = await _get_user_balance("test@zeitro.com")
    assert balance_before - balance_after == 10


@pytest.mark.asyncio
async def test_active_tasks_not_affected_by_penalty_check(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Future Task",
            "deadline": "2027-01-01T12:00:00Z",
            "priority": "low",
            "reward_amount": 0,
            "penalty_rate": 5,
        },
    )
    assert resp.status_code == 201
    task_id = resp.json()["id"]

    penalty_resp = await auth_client.post("/api/v1/tasks/check-penalties")
    assert penalty_resp.status_code == 200

    status = await _get_task_status(task_id)
    assert status == TaskStatus.active
