import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "new@zeitro.com", "password": "pass1234", "display_name": "New User"},
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "new@zeitro.com"
    assert data["display_name"] == "New User"
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@zeitro.com", "password": "pass1234", "display_name": "Dup"},
    )
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@zeitro.com", "password": "pass1234", "display_name": "Dup2"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "login@zeitro.com", "password": "pass1234", "display_name": "Login"},
    )
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@zeitro.com", "password": "pass1234", "grant_type": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 204
    assert "zeitro_auth" in resp.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "login@zeitro.com", "password": "wrongpass", "grant_type": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me_authorized(auth_client: AsyncClient):
    resp = await auth_client.get("/api/v1/users/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@zeitro.com"
    assert data["display_name"] == "Tester"
    assert data["currency_balance"] >= 0  # welcome bonus may be async


@pytest.mark.asyncio
async def test_logout(auth_client: AsyncClient):
    resp = await auth_client.post("/api/v1/auth/logout")
    assert resp.status_code == 204
