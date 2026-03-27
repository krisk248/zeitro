import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_start_session(auth_client: AsyncClient):
    task = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Session Task", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = task.json()["id"]

    resp = await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "manual"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["task_id"] == task_id
    assert data["ended_at"] is None
    assert data["session_type"] == "manual"


@pytest.mark.asyncio
async def test_start_session_already_active(auth_client: AsyncClient):
    task = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Double Session", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = task.json()["id"]

    # Stop any existing active session first
    active = await auth_client.get("/api/v1/sessions/active")
    if active.status_code == 200 and active.json() is not None:
        active_task_id = active.json()["task_id"]
        await auth_client.post(f"/api/v1/tasks/{active_task_id}/sessions/stop")

    await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "manual"},
    )
    resp = await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "manual"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_stop_session(auth_client: AsyncClient):
    task = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Stop Session", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = task.json()["id"]

    # Stop any existing active session first
    active = await auth_client.get("/api/v1/sessions/active")
    if active.status_code == 200 and active.json() is not None:
        active_task_id = active.json()["task_id"]
        await auth_client.post(f"/api/v1/tasks/{active_task_id}/sessions/stop")

    await auth_client.post(
        f"/api/v1/tasks/{task_id}/sessions/start",
        json={"session_type": "manual"},
    )
    resp = await auth_client.post(f"/api/v1/tasks/{task_id}/sessions/stop")
    assert resp.status_code == 200
    data = resp.json()
    assert data["ended_at"] is not None
    assert data["duration_seconds"] is not None
    assert data["duration_seconds"] >= 0


@pytest.mark.asyncio
async def test_stop_session_none_active(auth_client: AsyncClient):
    task = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "No Active", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = task.json()["id"]

    resp = await auth_client.post(f"/api/v1/tasks/{task_id}/sessions/stop")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_task_sessions(auth_client: AsyncClient):
    task = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "List Sessions", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = task.json()["id"]

    resp = await auth_client.get(f"/api/v1/tasks/{task_id}/sessions")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_get_active_session(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/sessions/active")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_session_on_nonexistent_task(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks/00000000-0000-0000-0000-000000000000/sessions/start",
        json={"session_type": "manual"},
    )
    assert resp.status_code == 404
