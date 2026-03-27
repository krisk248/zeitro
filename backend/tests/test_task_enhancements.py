import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_task_with_notes(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Task With Notes",
            "deadline": "2026-04-10T12:00:00Z",
            "notes": "Remember to check the docs first.",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["notes"] == "Remember to check the docs first."


@pytest.mark.asyncio
async def test_update_task_notes(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Notes Update Task", "deadline": "2026-04-10T12:00:00Z"},
    )
    assert create_resp.status_code == 201
    task_id = create_resp.json()["id"]
    assert create_resp.json()["notes"] is None

    resp = await auth_client.patch(
        f"/api/v1/tasks/{task_id}",
        json={"notes": "Added later."},
    )
    assert resp.status_code == 200
    assert resp.json()["notes"] == "Added later."


@pytest.mark.asyncio
async def test_get_task_has_notes(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Notes Field Present",
            "deadline": "2026-04-10T12:00:00Z",
            "notes": "some note",
        },
    )
    task_id = create_resp.json()["id"]

    resp = await auth_client.get(f"/api/v1/tasks/{task_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "notes" in data
    assert data["notes"] == "some note"


@pytest.mark.asyncio
async def test_duplicate_task(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Original Task",
            "deadline": "2026-04-20T12:00:00Z",
            "description": "original desc",
            "notes": "original notes",
            "priority": "high",
            "reward_amount": 15,
            "penalty_rate": 3,
        },
    )
    assert create_resp.status_code == 201
    original_id = create_resp.json()["id"]

    resp = await auth_client.post(f"/api/v1/tasks/{original_id}/duplicate")
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Copy of Original Task"
    assert data["description"] == "original desc"
    assert data["notes"] == "original notes"
    assert data["priority"] == "high"
    assert data["reward_amount"] == 15
    assert data["penalty_rate"] == 3
    assert data["id"] != original_id
    assert data["status"] == "active"
    assert data["is_completed"] is False


@pytest.mark.asyncio
async def test_duplicate_task_copies_tags(auth_client: AsyncClient):
    tag_resp = await auth_client.post(
        "/api/v1/tags",
        json={"name": "dup-tag", "color": "#FF0000"},
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    create_resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Tagged Original",
            "deadline": "2026-04-20T12:00:00Z",
            "tag_ids": [tag_id],
        },
    )
    assert create_resp.status_code == 201
    original_id = create_resp.json()["id"]
    assert len(create_resp.json()["tags"]) == 1

    resp = await auth_client.post(f"/api/v1/tasks/{original_id}/duplicate")
    assert resp.status_code == 201
    data = resp.json()
    assert len(data["tags"]) == 1
    assert data["tags"][0]["id"] == tag_id


@pytest.mark.asyncio
async def test_duplicate_task_not_found(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tasks/00000000-0000-0000-0000-000000000000/duplicate"
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_tasks_search(auth_client: AsyncClient):
    await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Filter Low", "deadline": "2026-04-10T12:00:00Z", "priority": "low"},
    )
    await auth_client.post(
        "/api/v1/tasks",
        json={"title": "Filter Urgent", "deadline": "2026-04-10T12:00:00Z", "priority": "urgent"},
    )

    resp = await auth_client.get("/api/v1/tasks?priority=low")
    assert resp.status_code == 200
    data = resp.json()
    assert all(t["priority"] == "low" for t in data)

    resp = await auth_client.get("/api/v1/tasks?priority=urgent")
    assert resp.status_code == 200
    data = resp.json()
    assert all(t["priority"] == "urgent" for t in data)

    resp = await auth_client.get("/api/v1/tasks?status=active")
    assert resp.status_code == 200
    data = resp.json()
    assert all(t["status"] == "active" for t in data)
