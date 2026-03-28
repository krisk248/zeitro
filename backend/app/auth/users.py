import uuid
from typing import Annotated

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin
from fastapi_users.authentication import AuthenticationBackend, CookieTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.engine import get_async_session
from app.models.user import User


async def get_user_db(session: Annotated[AsyncSession, Depends(get_async_session)]):
    yield SQLAlchemyUserDatabase(session, User)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = settings.SECRET_KEY
    verification_token_secret = settings.SECRET_KEY

    async def on_after_register(self, user: User, request: Request | None = None):
        from app.db.engine import async_session_maker
        from app.models.currency_transaction import CurrencyTransaction, TransactionType

        async with async_session_maker() as session:
            user_obj = await session.get(User, user.id)
            if user_obj:
                user_obj.currency_balance = 10
                tx = CurrencyTransaction(
                    user_id=user.id,
                    amount=10,
                    transaction_type=TransactionType.bonus,
                    description="Welcome bonus",
                )
                session.add(tx)
                await session.commit()


async def get_user_manager(user_db: Annotated[SQLAlchemyUserDatabase, Depends(get_user_db)]):
    yield UserManager(user_db)


cookie_transport = CookieTransport(
    cookie_name="zeitro_auth",
    cookie_max_age=3600 * 24 * 7,
    cookie_httponly=True,
    cookie_samesite="lax",
    cookie_secure=settings.COOKIE_SECURE,
    cookie_domain=settings.COOKIE_DOMAIN,
)


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.SECRET_KEY, lifetime_seconds=3600 * 24 * 7)


auth_backend = AuthenticationBackend(
    name="cookie",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](get_user_manager, [auth_backend])

current_active_user = fastapi_users.current_user(active=True)
