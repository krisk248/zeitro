import asyncio
import os
from collections.abc import AsyncGenerator

os.environ.setdefault("SECRET_KEY", "test-secret-key-minimum-32-characters-long-for-tests")
os.environ.setdefault("COOKIE_SECURE", "false")
os.environ.setdefault("DISABLE_RATE_LIMIT", "true")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.base import Base
from app.db.engine import get_async_session
from app.main import app

TEST_DB = "sqlite+aiosqlite:///./test.db"

engine = create_async_engine(TEST_DB, echo=False)
TestSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def override_get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with TestSessionLocal() as session:
        yield session


app.dependency_overrides[get_async_session] = override_get_async_session


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("PRAGMA foreign_keys=ON"))
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    if os.path.exists("./test.db"):
        os.remove("./test.db")


@pytest_asyncio.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_client(client: AsyncClient) -> AsyncClient:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "test@zeitro.com", "password": "testpass123", "display_name": "Tester"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        data={"username": "test@zeitro.com", "password": "testpass123", "grant_type": "password"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    cookies = login_resp.cookies
    client.cookies = cookies
    return client
