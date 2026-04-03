import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_habit(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/v1/habits",
        json={"name": "Morning Run", "color": "#10b981", "cadence": "daily", "reward_amount": 5},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "Morning Run"
    assert data["color"] == "#10b981"
    assert data["cadence"] == "daily"
    assert data["reward_amount"] == 5
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_list_habits(auth_client: AsyncClient):
    await auth_client.post("/api/v1/habits", json={"name": "Read Books"})
    resp = await auth_client.get("/api/v1/habits")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 1


@pytest.mark.asyncio
async def test_list_habits_active_only(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/habits", json={"name": "Inactive Habit"})
    habit_id = create_resp.json()["id"]
    await auth_client.patch(f"/api/v1/habits/{habit_id}", json={"is_active": False})

    active_resp = await auth_client.get("/api/v1/habits")
    active_names = [h["name"] for h in active_resp.json()]
    assert "Inactive Habit" not in active_names

    all_resp = await auth_client.get("/api/v1/habits?include_inactive=true")
    all_names = [h["name"] for h in all_resp.json()]
    assert "Inactive Habit" in all_names


@pytest.mark.asyncio
async def test_update_habit(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/habits", json={"name": "Meditate"})
    habit_id = create_resp.json()["id"]

    resp = await auth_client.patch(
        f"/api/v1/habits/{habit_id}",
        json={"name": "Meditation", "reward_amount": 3},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Meditation"
    assert data["reward_amount"] == 3


@pytest.mark.asyncio
async def test_delete_habit(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/habits", json={"name": "To Delete"})
    habit_id = create_resp.json()["id"]

    del_resp = await auth_client.delete(f"/api/v1/habits/{habit_id}")
    assert del_resp.status_code == 204

    list_resp = await auth_client.get("/api/v1/habits?include_inactive=true")
    ids = [h["id"] for h in list_resp.json()]
    assert habit_id not in ids


@pytest.mark.asyncio
async def test_check_in_today(auth_client: AsyncClient):
    summary_before = await auth_client.get("/api/v1/analytics/summary")
    balance_before = summary_before.json()["current_balance"]

    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Check-in Habit", "reward_amount": 10}
    )
    habit_id = create_resp.json()["id"]

    resp = await auth_client.post(f"/api/v1/habits/{habit_id}/check")
    assert resp.status_code == 200
    data = resp.json()
    assert data["completed"] is True
    assert data["habit_id"] == habit_id

    summary_after = await auth_client.get("/api/v1/analytics/summary")
    balance_after = summary_after.json()["current_balance"]
    assert balance_after == balance_before + 10


@pytest.mark.asyncio
async def test_check_in_toggle(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Toggle Habit", "reward_amount": 7}
    )
    habit_id = create_resp.json()["id"]

    first = await auth_client.post(f"/api/v1/habits/{habit_id}/check")
    assert first.json()["completed"] is True

    summary_mid = await auth_client.get("/api/v1/analytics/summary")
    balance_mid = summary_mid.json()["current_balance"]

    second = await auth_client.post(f"/api/v1/habits/{habit_id}/check")
    assert second.json()["completed"] is False

    summary_after = await auth_client.get("/api/v1/analytics/summary")
    balance_after = summary_after.json()["current_balance"]
    assert balance_after == balance_mid - 7


@pytest.mark.asyncio
async def test_check_in_duplicate_day(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Duplicate Day Habit", "reward_amount": 2}
    )
    habit_id = create_resp.json()["id"]

    first = await auth_client.post(f"/api/v1/habits/{habit_id}/check")
    assert first.status_code == 200
    assert first.json()["completed"] is True

    second = await auth_client.post(f"/api/v1/habits/{habit_id}/check")
    assert second.status_code == 200
    assert second.json()["completed"] is False


@pytest.mark.asyncio
async def test_habit_history(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/v1/habits", json={"name": "History Habit"})
    habit_id = create_resp.json()["id"]

    await auth_client.post(f"/api/v1/habits/{habit_id}/check")

    resp = await auth_client.get(f"/api/v1/habits/{habit_id}/history?year=2026")
    assert resp.status_code == 200
    data = resp.json()
    assert "entries" in data
    entries = data["entries"]
    assert len(entries) == 365
    dates = [e["date"] for e in entries]
    assert "2026-01-01" in dates
    assert "2026-12-31" in dates
    for entry in entries:
        assert "date" in entry
        assert "completed" in entry
        assert isinstance(entry["completed"], bool)


@pytest.mark.asyncio
async def test_check_past_date_succeeds(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Backfill Habit", "reward_amount": 3}
    )
    habit_id = create_resp.json()["id"]

    resp = await auth_client.post(
        f"/api/v1/habits/{habit_id}/check?client_date=2026-03-20"
    )
    assert resp.status_code == 200
    assert resp.json()["completed"] is True
    assert resp.json()["date"] == "2026-03-20"


@pytest.mark.asyncio
async def test_check_past_date_charges_penalty(auth_client: AsyncClient):
    summary_before = await auth_client.get("/api/v1/analytics/summary")
    balance_before = summary_before.json()["current_balance"]

    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Penalty Backfill", "reward_amount": 5}
    )
    habit_id = create_resp.json()["id"]

    await auth_client.post(
        f"/api/v1/habits/{habit_id}/check?client_date=2026-03-15"
    )

    summary_after = await auth_client.get("/api/v1/analytics/summary")
    balance_after = summary_after.json()["current_balance"]
    # Past date costs penalty (reward_amount), no reward earned
    assert balance_after == balance_before - 5


@pytest.mark.asyncio
async def test_check_future_date_rejected(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Future Habit"}
    )
    habit_id = create_resp.json()["id"]

    resp = await auth_client.post(
        f"/api/v1/habits/{habit_id}/check?client_date=2027-01-01"
    )
    assert resp.status_code == 400
    assert "future" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_check_today_no_penalty(auth_client: AsyncClient):
    summary_before = await auth_client.get("/api/v1/analytics/summary")
    balance_before = summary_before.json()["current_balance"]

    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Today No Penalty", "reward_amount": 4}
    )
    habit_id = create_resp.json()["id"]

    # Check in for today (no client_date = today)
    await auth_client.post(f"/api/v1/habits/{habit_id}/check")

    summary_after = await auth_client.get("/api/v1/analytics/summary")
    balance_after = summary_after.json()["current_balance"]
    # Today earns reward, no penalty
    assert balance_after == balance_before + 4


@pytest.mark.asyncio
async def test_check_past_already_checked_idempotent(auth_client: AsyncClient):
    create_resp = await auth_client.post(
        "/api/v1/habits", json={"name": "Idempotent Past", "reward_amount": 2}
    )
    habit_id = create_resp.json()["id"]

    # First backfill
    resp1 = await auth_client.post(
        f"/api/v1/habits/{habit_id}/check?client_date=2026-03-10"
    )
    assert resp1.json()["completed"] is True

    summary_mid = await auth_client.get("/api/v1/analytics/summary")
    balance_mid = summary_mid.json()["current_balance"]

    # Second backfill same date - should not charge again
    resp2 = await auth_client.post(
        f"/api/v1/habits/{habit_id}/check?client_date=2026-03-10"
    )
    assert resp2.json()["completed"] is True

    summary_after = await auth_client.get("/api/v1/analytics/summary")
    balance_after = summary_after.json()["current_balance"]
    assert balance_after == balance_mid  # No additional charge


@pytest.mark.asyncio
async def test_habits_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/habits")
    assert resp.status_code == 401

    resp = await client.post("/api/v1/habits", json={"name": "Test"})
    assert resp.status_code == 401
