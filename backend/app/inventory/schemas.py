from decimal import Decimal

from pydantic import BaseModel


class VendorItemPriceOut(BaseModel):
    vendor_id: int
    vendor_name: str
    price: Decimal
    lead_time_days: int | None
    recorded_at: str

    class Config:
        from_attributes = True


class ProcurementItemCreate(BaseModel):
    item_id: int
    vendor_id: int | None = None
    spec: str | None = None
    qty: Decimal
    vendor_price: Decimal
    client_price: Decimal | None = None  # wajib diisi kalau price_mode = client_price_known
    margin_override: Decimal | None = None  # wajib diisi kalau price_mode = margin_only


class ProcurementCreate(BaseModel):
    client_id: int
    title: str
    price_mode: str = "client_price_known"  # "client_price_known" | "margin_only"
    bonus_amount: Decimal = Decimal("0")
    items: list[ProcurementItemCreate] = []


class ProcurementItemOut(BaseModel):
    id: int
    item_id: int
    spec: str | None
    qty: Decimal
    vendor_price: Decimal
    client_price: Decimal | None
    margin_per_item: Decimal

    class Config:
        from_attributes = True


class ProcurementSummaryOut(BaseModel):
    id: int
    title: str
    status: str
    price_mode: str
    bonus_amount: Decimal
    total_item_margin: Decimal
    total_profit: Decimal
    items: list[ProcurementItemOut]
