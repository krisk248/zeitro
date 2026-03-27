import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

from app.db.base import Base
from app.models.user import User  # noqa: F401
from app.models.task import Task  # noqa: F401
from app.models.tag import Tag, task_tags  # noqa: F401
from app.models.work_session import WorkSession  # noqa: F401
from app.models.currency_transaction import CurrencyTransaction  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

db_url = os.environ.get("DATABASE_URL")
if db_url:
    db_url_sync = db_url.replace("sqlite+aiosqlite:", "sqlite:")
    config.set_main_option("sqlalchemy.url", db_url_sync)


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
