from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Business(Base):
    """
    Daftar unit bisnis di bawah twoppals (Cobi Kerupuk, Inventory, dst).
    Menambah bisnis baru = insert row baru di sini, tidak perlu ubah struktur.
    """

    __tablename__ = "businesses"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)  # ex: "cobi_kerupuk"
    name: Mapped[str] = mapped_column(String(150))  # ex: "Cobi Kerupuk"
    icon: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)  # ex: "owner", "staff"


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "core"}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150))
    email: Mapped[str] = mapped_column(String(150), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role_id: Mapped[int] = mapped_column(ForeignKey("core.roles.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    role: Mapped["Role"] = relationship()
