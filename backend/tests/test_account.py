import pytest
from httpx import AsyncClient


REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"


async def register_and_login(client: AsyncClient, email: str, password: str, display_name: str) -> AsyncClient:
    await client.post(
        REGISTER_URL,
        json={"email": email, "password": password, "display_name": display_name},
    )
    resp = await client.post(
        LOGIN_URL,
        data={"username": email, "password": password, "grant_type": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    client.cookies = resp.cookies
    return client


@pytest.mark.asyncio
async def test_update_profile(client: AsyncClient):
    await register_and_login(client, "profile@zeitro.com", "pass1234", "Original")
    resp = await client.patch(
        "/api/v1/account/profile",
        json={"display_name": "Updated Name"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "Updated Name"


@pytest.mark.asyncio
async def test_update_theme_preference(client: AsyncClient):
    await register_and_login(client, "theme@zeitro.com", "pass1234", "ThemeUser")
    resp = await client.patch(
        "/api/v1/account/profile",
        json={"theme_preference": "light"},
    )
    assert resp.status_code == 200
    assert resp.json()["theme_preference"] == "light"

    resp = await client.patch(
        "/api/v1/account/profile",
        json={"theme_preference": "dark"},
    )
    assert resp.status_code == 200
    assert resp.json()["theme_preference"] == "dark"

    resp = await client.patch(
        "/api/v1/account/profile",
        json={"theme_preference": "invalid"},
    )
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_change_password_success(client: AsyncClient):
    await register_and_login(client, "pwchange@zeitro.com", "oldpass123", "PwUser")
    resp = await client.post(
        "/api/v1/account/change-password",
        json={"current_password": "oldpass123", "new_password": "newpass456"},
    )
    assert resp.status_code == 200
    assert resp.json()["detail"] == "Password updated successfully"

    # verify new password works
    login_resp = await client.post(
        LOGIN_URL,
        data={"username": "pwchange@zeitro.com", "password": "newpass456", "grant_type": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_resp.status_code == 204


@pytest.mark.asyncio
async def test_change_password_wrong_current(client: AsyncClient):
    await register_and_login(client, "pwwrong@zeitro.com", "correctpass", "WrongPw")
    resp = await client.post(
        "/api/v1/account/change-password",
        json={"current_password": "wrongpass", "new_password": "newpass456"},
    )
    assert resp.status_code == 400
    assert "incorrect" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_export_data(client: AsyncClient):
    await register_and_login(client, "export@zeitro.com", "pass1234", "ExportUser")
    resp = await client.get("/api/v1/account/export")
    assert resp.status_code == 200
    data = resp.json()
    assert "user" in data
    assert "tasks" in data
    assert "work_sessions" in data
    assert "currency_transactions" in data
    assert data["user"]["email"] == "export@zeitro.com"
    assert data["user"]["display_name"] == "ExportUser"
    assert isinstance(data["tasks"], list)
    assert isinstance(data["work_sessions"], list)
    assert isinstance(data["currency_transactions"], list)


@pytest.mark.asyncio
async def test_delete_account_success(client: AsyncClient):
    await register_and_login(client, "todelete@zeitro.com", "deletepass", "DeleteMe")
    resp = await client.request(
        "DELETE",
        "/api/v1/account",
        json={"password": "deletepass"},
    )
    assert resp.status_code == 204

    # verify account is gone
    login_resp = await client.post(
        LOGIN_URL,
        data={"username": "todelete@zeitro.com", "password": "deletepass", "grant_type": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_resp.status_code == 400


@pytest.mark.asyncio
async def test_delete_account_wrong_password(client: AsyncClient):
    await register_and_login(client, "nodelete@zeitro.com", "correctpass", "KeepMe")
    resp = await client.request(
        "DELETE",
        "/api/v1/account",
        json={"password": "wrongpass"},
    )
    assert resp.status_code == 400
    assert "incorrect" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_account_endpoints_unauthorized(client: AsyncClient):
    resp = await client.patch("/api/v1/account/profile", json={"display_name": "X"})
    assert resp.status_code == 401

    resp = await client.post(
        "/api/v1/account/change-password",
        json={"current_password": "a", "new_password": "b"},
    )
    assert resp.status_code == 401

    resp = await client.get("/api/v1/account/export")
    assert resp.status_code == 401

    resp = await client.request("DELETE", "/api/v1/account", json={"password": "x"})
    assert resp.status_code == 401
