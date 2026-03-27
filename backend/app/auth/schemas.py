import uuid

from fastapi_users import schemas


class UserRead(schemas.BaseUser[uuid.UUID]):
    display_name: str
    currency_balance: int


class UserCreate(schemas.BaseUserCreate):
    display_name: str = ""


class UserUpdate(schemas.BaseUserUpdate):
    display_name: str | None = None
