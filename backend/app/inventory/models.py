from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

SCHEMA = "inventory"


class Vendor(Base):
    __tablename__ = "vendors"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    contact: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Item(Base):
    """Master barang (independen dari vendor) — ex: 'Tumbler stainless 500ml'."""

    __tablename__ = "items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VendorItemPrice(Base):
    """
    Histori harga tiap vendor untuk tiap barang -> dasar perbandingan vendor.
    Setiap update harga = row baru, bukan overwrite, supaya ada histori.
    """

    __tablename__ = "vendor_item_prices"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.vendors.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.items.id"))
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    lead_time_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Client(Base):
    __tablename__ = "clients"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    contact: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Procurement(Base):
    """
    Satu project pengadaan untuk 1 client (ex: 'Tumbler custom - Client Acme').

    price_mode menentukan cara pencatatan untuk SEMUA item di project ini:
      - "client_price_known": item punya client_price yang terkunci, margin dihitung otomatis
      - "margin_only": client_price tidak dicatat, margin diinput manual per item
    bonus_amount: bonus dari client, levelnya per-project (bukan per item).
    """

    __tablename__ = "procurements"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.clients.id"))
    title: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(30), default="cari_vendor")
    # status: cari_vendor | deal | po_dikirim | diterima | selesai
    price_mode: Mapped[str] = mapped_column(String(20), default="client_price_known")
    bonus_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    client: Mapped["Client"] = relationship()
    items: Mapped[list["ProcurementItem"]] = relationship(back_populates="procurement")


class ProcurementItem(Base):
    """
    Baris barang dalam 1 project pengadaan.

    - client_price: diisi & TERKUNCI kalau price_mode = "client_price_known", null kalau "margin_only"
    - client_price_locked: penanda supaya tidak berubah tanpa aksi eksplisit "revisi harga client"
    - vendor_price: harga dari vendor, bisa berubah kapan saja
    - margin_override: dipakai kalau price_mode = "margin_only" (input manual per item)
    """

    __tablename__ = "procurement_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    procurement_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.procurements.id"))
    item_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.items.id"))
    vendor_id: Mapped[int | None] = mapped_column(ForeignKey(f"{SCHEMA}.vendors.id"), nullable=True)

    spec: Mapped[str | None] = mapped_column(String(255), nullable=True)  # ex: "logo custom, warna navy"
    qty: Mapped[Decimal] = mapped_column(Numeric(14, 2))

    client_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    client_price_locked: Mapped[bool] = mapped_column(Boolean, default=False)
    vendor_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    margin_override: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)

    procurement: Mapped["Procurement"] = relationship(back_populates="items")

    @property
    def margin_per_item(self) -> Decimal:
        """Margin dihitung otomatis kalau client_price ada, atau pakai margin_override kalau mode margin_only."""
        if self.client_price is not None:
            return self.client_price - self.vendor_price
        return self.margin_override or Decimal("0")
