from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./zeitro.db"
    SECRET_KEY: str = Field(min_length=32)
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    API_PREFIX: str = "/api/v1"
    COOKIE_SECURE: bool = True
    COOKIE_DOMAIN: str | None = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
