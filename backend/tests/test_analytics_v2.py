import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analytics_weekly(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/analytics/weekly")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for entry in data:
        assert "week" in entry
        assert "sessions_count" in entry
        assert "total_minutes" in entry
        assert isinstance(entry["sessions_count"], int)
        assert isinstance(entry["total_minutes"], float)


@pytest.mark.asyncio
async def test_analytics_tags(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/analytics/tags")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for entry in data:
        assert "tag_name" in entry
        assert "tag_color" in entry
        assert "task_count" in entry
        assert "completed_count" in entry
        assert "total_minutes" in entry


@pytest.mark.asyncio
async def test_analytics_tags_with_data(auth_client: AsyncClient):
    tag_resp = await auth_client.post(
        "/api/v1/tags", json={"name": "Analytics Tag", "color": "#f59e0b"}
    )
    assert tag_resp.status_code == 201
    tag_id = tag_resp.json()["id"]

    from datetime import datetime, timedelta, timezone
    deadline = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    await auth_client.post(
        "/api/v1/tasks",
        json={
            "title": "Tagged Task",
            "deadline": deadline,
            "tag_ids": [tag_id],
        },
    )

    resp = await auth_client.get("/api/v1/analytics/tags")
    assert resp.status_code == 200
    data = resp.json()
    tag_names = [entry["tag_name"] for entry in data]
    assert "Analytics Tag" in tag_names

    tag_entry = next(e for e in data if e["tag_name"] == "Analytics Tag")
    assert tag_entry["task_count"] >= 1
    assert tag_entry["tag_color"] == "#f59e0b"


@pytest.mark.asyncio
async def test_analytics_habits(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/analytics/habits")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    for entry in data:
        assert "habit_name" in entry
        assert "habit_color" in entry
        assert "cadence" in entry
        assert "current_streak" in entry
        assert "total_completions" in entry
        assert "completion_rate" in entry


@pytest.mark.asyncio
async def test_analytics_habits_with_checkin(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/habits",
        json={"name": "Analytics Test Habit", "color": "#8b5cf6", "cadence": "daily", "reward_amount": 3},
    )
    assert create_resp.status_code == 201

    await auth_client.post(f"/api/v1/habits/{create_resp.json()['id']}/check")

    resp = await auth_client.get("/api/v1/analytics/habits")
    assert resp.status_code == 200
    data = resp.json()
    habit_names = [e["habit_name"] for e in data]
    assert "Analytics Test Habit" in habit_names

    entry = next(e for e in data if e["habit_name"] == "Analytics Test Habit")
    assert entry["current_streak"] >= 1
    assert entry["total_completions"] >= 1
    assert entry["completion_rate"] > 0
    assert entry["cadence"] == "daily"
    assert entry["habit_color"] == "#8b5cf6"


@pytest.mark.asyncio
async def test_analytics_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/analytics/weekly")
    assert resp.status_code == 401

    resp = await client.get("/api/v1/analytics/tags")
    assert resp.status_code == 401

    resp = await client.get("/api/v1/analytics/habits")
    assert resp.status_code == 401
