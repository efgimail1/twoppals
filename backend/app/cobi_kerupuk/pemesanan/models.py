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
    Status: draft -> dikonfirmasi -> diproses -> siap -> dikirim -> selesai
    (dibatalkan bisa dari status manapun). Tidak divalidasi ketat urutannya -
    user bebas lompat status sesuai kebutuhan bisnis riil.
    """

    __tablename__ = "sales_orders"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.customers.id"))
    order_date: Mapped[date] = mapped_column(Date)
    due_date: Mapped[date] = mapped_column(Date)  # tanggal kirim/ambil
    status: Mapped[str] = mapped_column(String(30), default="draft")
    shipping_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    customer: Mapped["Customer"] = relationship()
    items: Mapped[list["SalesOrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    status_logs: Mapped[list["OrderStatusLog"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", order_by="OrderStatusLog.changed_at"
    )


class SalesOrderItem(Base):
    __tablename__ = "sales_order_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sales_orders.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.products.id"))
    qty: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    discount_type: Mapped[str] = mapped_column(String(10), default="percent")  # percent | amount
    discount_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=Decimal("0"))

    order: Mapped["SalesOrder"] = relationship(back_populates="items")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sales_orders.id"))
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    payment_date: Mapped[date] = mapped_column(Date)
    method: Mapped[str] = mapped_column(String(20), default="cash")
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped["SalesOrder"] = relationship(back_populates="payments")


class OrderStatusLog(Base):
    """Jejak histori perubahan status - kapan order pindah dari status A ke B."""

    __tablename__ = "order_status_logs"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sales_orders.id"))
    status: Mapped[str] = mapped_column(String(30))
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    order: Mapped["SalesOrder"] = relationship(back_populates="status_logs")
