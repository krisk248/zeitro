import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_analytics_summary(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/analytics/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_tasks" in data
    assert "completed_tasks" in data


@pytest.mark.asyncio
async def test_analytics_daily(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/analytics/daily")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_analytics_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/analytics/summary")
    assert resp.status_code == 401
