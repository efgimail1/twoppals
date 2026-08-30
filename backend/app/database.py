from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Base class untuk semua model SQLAlchemy di seluruh modul."""

    pass


def get_db():
    """
    Dependency FastAPI untuk dapat 1 session DB per request,
    otomatis ditutup setelah request selesai.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
