from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.inventory.models import Procurement, ProcurementItem, Vendor, VendorItemPrice


def compare_vendor_prices(db: Session, item_id: int) -> list[dict]:
    """
    Ambil harga TERBARU dari tiap vendor untuk 1 barang, diurutkan termurah dulu.
    Dipakai untuk layar 'Perbandingan vendor'.
    """
    # subquery: harga terakhir per vendor untuk item ini
    rows = db.execute(
        select(VendorItemPrice, Vendor.name)
        .join(Vendor, Vendor.id == VendorItemPrice.vendor_id)
        .where(VendorItemPrice.item_id == item_id)
        .order_by(VendorItemPrice.vendor_id, VendorItemPrice.recorded_at.desc())
    ).all()

    latest_per_vendor: dict[int, dict] = {}
    for price_row, vendor_name in rows:
        if price_row.vendor_id not in latest_per_vendor:
            latest_per_vendor[price_row.vendor_id] = {
                "vendor_id": price_row.vendor_id,
                "vendor_name": vendor_name,
                "price": price_row.price,
                "lead_time_days": price_row.lead_time_days,
                "recorded_at": price_row.recorded_at.isoformat(),
            }

    return sorted(latest_per_vendor.values(), key=lambda r: r["price"])


def calculate_procurement_summary(procurement: Procurement) -> dict:
    """
    Total margin barang = sum margin_per_item (otomatis dari client_price - vendor_price,
    atau margin_override kalau mode margin_only).
    Total untung project = total margin barang + bonus (bonus levelnya per-project, TIDAK dibagi ke item).
    """
    total_item_margin = sum((item.margin_per_item for item in procurement.items), Decimal("0"))
    total_profit = total_item_margin + procurement.bonus_amount

    return {
        "total_item_margin": total_item_margin,
        "total_profit": total_profit,
    }


def lock_client_price(item: ProcurementItem):
    """Dipanggil saat status project pindah ke 'deal' -> harga client tidak bisa diubah langsung lagi."""
    item.client_price_locked = True
