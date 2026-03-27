import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Test Task",
            "deadline": "2026-04-01T12:00:00Z",
            "priority": "high",
            "reward_amount": 10,
            "penalty_rate": 1,
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Test Task"
    assert data["status"] == "active"
    assert data["priority"] == "high"
    assert data["reward_amount"] == 10
    assert data["is_completed"] is False
    assert "tags" in data  # tags field must be present
    assert isinstance(data["tags"], list)
    assert "id" in data
    assert "time_remaining" in data


@pytest.mark.asyncio
async def test_create_task_missing_title(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={"deadline": "2026-04-01T12:00:00Z"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_task_missing_deadline(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "No deadline"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_list_tasks(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/tasks")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for task in data:
        assert "id" in task
        assert "title" in task
        assert "tags" in task
        assert "status" in task


@pytest.mark.asyncio
async def test_get_task(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Get Me", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = create_resp.json()["id"]

    resp = await auth_client.get(f"/api/v1/tasks/{task_id}")
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get Me"
    assert "tags" in resp.json()


@pytest.mark.asyncio
async def test_get_task_not_found(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/tasks/00000000-0000-0000-0000-000000000000")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_task(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Update Me", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = create_resp.json()["id"]

    resp = await auth_client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"title": "Updated Title", "priority": "urgent"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["priority"] == "urgent"


@pytest.mark.asyncio
async def test_delete_task(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Delete Me", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = create_resp.json()["id"]

    resp = await auth_client.delete(f"/api/v1/tasks/{task_id}")
    assert resp.status_code == 204

    get_resp = await auth_client.get(f"/api/v1/tasks/{task_id}")
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_complete_task(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Complete Me",
            "deadline": "2026-04-01T12:00:00Z",
            "reward_amount": 5,
        },
    )
    task_id = create_resp.json()["id"]

    resp = await auth_client.post(f"/api/v1/tasks/{task_id}/complete")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_completed"] is True
    assert data["status"] == "completed"
    assert data["completed_at"] is not None

    # Check balance increased
    me_resp = await auth_client.get("/api/v1/users/me")
    assert me_resp.json()["currency_balance"] >= 5  # at least the 5 reward


@pytest.mark.asyncio
async def test_complete_task_twice(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Double Complete", "deadline": "2026-04-01T12:00:00Z"},
    )
    task_id = create_resp.json()["id"]

    await auth_client.post(f"/api/v1/tasks/{task_id}/complete")
    resp = await auth_client.post(f"/api/v1/tasks/{task_id}/complete")
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_create_task_unauthorized(client: AsyncClient):
    resp = await client.post(
        "/api/v1/tasks",
        json={"title": "Unauth", "deadline": "2026-04-01T12:00:00Z"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_tasks_with_filter(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/tasks?status=completed")
    assert resp.status_code == 200

    resp = await auth_client.get("/api/v1/tasks?priority=urgent")
    assert resp.status_code == 200
