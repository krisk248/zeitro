import pytest
from httpx import AsyncClient


async def _stop_active(client: AsyncClient) -> None:
    active = await client.get("/api/v1/sessions/active")
    if active.status_code == 200 and active.json() is not None:
        active_task_id = active.json()["task_id"]
        await client.post(f"/api/v1/tasks/{active_task_id}/sessions/stop")


async def _create_task(client: AsyncClient, title: str) -> str:
    resp = await client.post(
        "/api/v1/tasks",
        json={"title": title, "deadline": "2026-04-01T12:00:00Z"},
    )
    return resp.json()["id"]


@pytest.mark.asyncio
async def test_start_pomodoro_session(auth_client: AsyncClient):
    await _stop_active(auth_client)
    task_id = await _create_task(auth_client, "Pomodoro Task Start")

    resp = await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "pomodoro", "pomodoro_duration": 25},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["session_type"] == "pomodoro"
    assert data["pomodoro_duration"] == 25
    assert data["ended_at"] is None


@pytest.mark.asyncio
async def test_stop_pomodoro_session(auth_client: AsyncClient):
    await _stop_active(auth_client)
    task_id = await _create_task(auth_client, "Pomodoro Task Stop")

    await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "pomodoro", "pomodoro_duration": 25},
    )
    resp = await auth_client.post(f"/api/v1/tasks/{task_id}/sessions/stop")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ended_at"] is not None
    assert data["duration_seconds"] is not None
    assert data["duration_seconds"] >= 0
    assert data["session_type"] == "pomodoro"


@pytest.mark.asyncio
async def test_pomodoro_stats_empty(auth_client: AsyncClient):
    await _stop_active(auth_client)
    task_id = await _create_task(auth_client, "Pomodoro Stats Empty")

    resp = await auth_client.get(f"/api/v1/tasks/{task_id}/pomodoro-stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_pomodoros"] == 0
    assert data["total_minutes"] == 0
    assert data["average_duration"] == 0.0


@pytest.mark.asyncio
async def test_pomodoro_stats_with_sessions(auth_client: AsyncClient):
    await _stop_active(auth_client)
    task_id = await _create_task(auth_client, "Pomodoro Stats With Sessions")

    await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "pomodoro", "pomodoro_duration": 25},
    )
    await auth_client.post(f"/api/v1/tasks/{task_id}/sessions/stop")

    resp = await auth_client.get(f"/api/v1/tasks/{task_id}/pomodoro-stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_pomodoros"] == 1
    assert data["total_minutes"] >= 0
    assert data["average_duration"] >= 0.0


@pytest.mark.asyncio
async def test_pomodoro_session_preserves_duration(auth_client: AsyncClient):
    await _stop_active(auth_client)
    task_id = await _create_task(auth_client, "Pomodoro Duration Preserved")

    resp = await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "pomodoro", "pomodoro_duration": 50},
    )
    assert resp.status_code == 201
    assert resp.json()["pomodoro_duration"] == 50

    stop_resp = await auth_client.post(f"/api/v1/tasks/{task_id}/sessions/stop")
    assert stop_resp.json()["pomodoro_duration"] == 50
