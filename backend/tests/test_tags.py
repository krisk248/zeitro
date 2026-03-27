import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_tag(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/tags",
        json={"name": "Work", "color": "#3B82F6"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Work"
    assert data["color"] == "#3B82F6"


@pytest.mark.asyncio
async def test_list_tags(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/tags")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_delete_tag(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/tags",
        json={"name": "DeleteMe", "color": "#FF0000"},
    )
    tag_id = create_resp.json()["id"]

    resp = await auth_client.delete(f"/api/v1/tags/{tag_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_create_task_with_tags(auth_client: AsyncClient):
    tag_resp = await auth_client.post(
        "/api/v1/tags",
        json={"name": "Tagged", "color": "#10B981"},
    )
    tag_id = tag_resp.json()["id"]

    task_resp = await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Task With Tag",
            "deadline": "2026-04-01T12:00:00Z",
            "tag_ids": [tag_id],
        },
    )
    assert task_resp.status_code == 201
    data = task_resp.json()
    assert "tags" in data
    assert len(data["tags"]) == 1
    assert data["tags"][0]["name"] == "Tagged"
    assert data["tags"][0]["color"] == "#10B981"


@pytest.mark.asyncio
async def test_tags_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/tags")
    assert resp.status_code == 401
