from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.database import Base

# Import semua model supaya Alembic autogenerate bisa mendeteksinya
from app.core import models as core_models  # noqa: F401
from app.cobi_kerupuk import models as cobi_kerupuk_models  # noqa: F401
from app.inventory import models as inventory_models  # noqa: F401
from app.cobi_kerupuk.pemesanan import models as pemesanan_models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Schema yang dipakai project ini -- Alembic perlu tahu ini untuk 'include_schemas'
SCHEMAS = ["core", "cobi_kerupuk", "inventory"]


def include_object(object, name, type_, reflected, compare_to):
    return True


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        include_schemas=True,
        version_table_schema="core",
        dialect_opts={"paramstyle": "named"},
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
        # Pastikan schema sudah ada sebelum tabel dibuat di dalamnya
        for schema in SCHEMAS:
            connection.exec_driver_sql(f"CREATE SCHEMA IF NOT EXISTS {schema}")
        connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            include_object=include_object,
            version_table_schema="core",
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
