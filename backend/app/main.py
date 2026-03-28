import os
import time
from collections import defaultdict
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.auth.schemas import UserCreate, UserRead, UserUpdate
from app.auth.users import auth_backend, fastapi_users
from app.config import settings
from app.db.engine import engine
from app.routers import account, analytics, habits, sessions, stream, tags, tasks

rate_limit_store: dict[str, list[float]] = defaultdict(list)
AUTH_RATE_LIMIT = 10
AUTH_RATE_WINDOW = 60


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    async with engine.connect() as conn:
        await conn.execute(text("PRAGMA journal_mode=WAL"))
        await conn.execute(text("PRAGMA foreign_keys=ON"))
        await conn.execute(text("PRAGMA busy_timeout=5000"))
        await conn.execute(text("PRAGMA cache_size=-20000"))
        await conn.execute(text("PRAGMA mmap_size=134217728"))
        await conn.execute(text("PRAGMA synchronous=NORMAL"))
        await conn.commit()
    yield


app = FastAPI(
    title="Zeitro API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_auth(request: Request, call_next):
    if os.environ.get("DISABLE_RATE_LIMIT") == "true":
        return await call_next(request)
    if request.url.path.startswith(f"{settings.API_PREFIX}/auth/"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        timestamps = rate_limit_store[client_ip]
        rate_limit_store[client_ip] = [t for t in timestamps if now - t < AUTH_RATE_WINDOW]
        if len(rate_limit_store[client_ip]) >= AUTH_RATE_LIMIT:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Try again later."},
            )
        rate_limit_store[client_ip].append(now)
    if request.url.path == f"{settings.API_PREFIX}/auth/register" and request.method == "POST":
        if not settings.REGISTRATION_ENABLED:
            return JSONResponse(
                status_code=403,
                content={"detail": "Registration is disabled."},
            )
    return await call_next(request)


app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix=f"{settings.API_PREFIX}/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix=f"{settings.API_PREFIX}/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix=f"{settings.API_PREFIX}/users",
    tags=["users"],
)

app.include_router(tasks.router, prefix=settings.API_PREFIX)
app.include_router(sessions.router, prefix=settings.API_PREFIX)
app.include_router(tags.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(habits.router, prefix=settings.API_PREFIX)
app.include_router(stream.router, prefix=settings.API_PREFIX)
app.include_router(account.router, prefix=settings.API_PREFIX)
