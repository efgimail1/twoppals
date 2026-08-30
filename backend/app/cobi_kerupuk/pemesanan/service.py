from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.cobi_kerupuk.models import Product
from app.cobi_kerupuk.pemesanan.models import Payment, SalesOrder, SalesOrderItem

ORDER_STATUSES = ["draft", "dikonfirmasi", "siap", "selesai", "dibatalkan"]


def compute_payment_status(total: Decimal, paid: Decimal) -> str:
    if paid <= 0:
        return "belum_bayar"
    if paid >= total:
        return "lunas"
    return "dp"


def get_order_totals(order: SalesOrder) -> dict:
    items_total = sum(
        (item.qty * item.unit_price for item in order.items), Decimal("0")
    )
    total = items_total + order.shipping_cost
    paid = sum((p.amount for p in order.payments), Decimal("0"))
    remaining = total - paid
    return {
        "items_total": items_total,
        "total": total,
        "paid": paid,
        "remaining": remaining,
        "payment_status": compute_payment_status(total, paid),
    }


def create_order(
    db: Session,
    customer_id: int,
    due_date: date,
    shipping_cost: Decimal,
    notes: str | None,
    items_input: list,
) -> SalesOrder:
    """
    Harga jual di-snapshot dari Product.selling_price SAAT order dibuat (prinsip sama
    seperti snapshot resep) - supaya kalau harga jual produk berubah nanti,
    order lama tidak ikut berubah nilainya.
    """
    order = SalesOrder(
        customer_id=customer_id,
        due_date=due_date,
        shipping_cost=shipping_cost,
        notes=notes,
        status="draft",
    )
    for item_in in items_input:
        product = db.get(Product, item_in.product_id)
        if product is None:
            raise ValueError(f"Produk {item_in.product_id} tidak ditemukan")
        order.items.append(
            SalesOrderItem(
                product_id=product.id, qty=item_in.qty, unit_price=product.selling_price
            )
        )

    db.add(order)
    db.commit()
    db.refresh(order)
    return order


def add_payment(
    db: Session,
    order: SalesOrder,
    amount: Decimal,
    payment_date: date | None,
    method: str,
    notes: str | None,
) -> Payment:
    payment = Payment(
        order_id=order.id,
        amount=amount,
        payment_date=payment_date or datetime.utcnow().date(),
        method=method,
        notes=notes,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
