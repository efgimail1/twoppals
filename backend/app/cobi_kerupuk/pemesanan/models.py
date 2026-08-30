from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

SCHEMA = "cobi_kerupuk"


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SalesOrder(Base):
    """
    Status alur: draft -> dikonfirmasi -> siap -> selesai (atau dibatalkan kapan saja).
    Status produksi (diproduksi, cek stok, dll) menyusul di Fase 3.
    """

    __tablename__ = "sales_orders"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.customers.id"))
    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    due_date: Mapped[date] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(30), default="draft")
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    customer: Mapped["Customer"] = relationship()
    items: Mapped[list["SalesOrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sales_orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.products.id"))
    qty: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))  # snapshot harga jual saat order dibuat

    order: Mapped["SalesOrder"] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sales_orders.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    payment_date: Mapped[date] = mapped_column(Date)
    method: Mapped[str] = mapped_column(String(20), default="cash")  # cash | transfer | qris
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped["SalesOrder"] = relationship(back_populates="payments")
