from datetime import date, datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from app.cobi_kerupuk.models import Product
from app.cobi_kerupuk.pemesanan.models import OrderStatusLog, Payment, SalesOrder, SalesOrderItem

ORDER_STATUSES = ["draft", "dikonfirmasi", "diproses", "siap", "dikirim", "selesai", "dibatalkan"]


def compute_payment_status(total: Decimal, paid: Decimal) -> str:
    if paid <= 0:
        return "belum_bayar"
    if paid >= total:
        return "lunas"
    return "dp"


def line_discount_amount(qty: Decimal, unit_price: Decimal, discount_type: str, discount_value: Decimal) -> Decimal:
    line_total = qty * unit_price
    if discount_type == "percent":
        return line_total * discount_value / Decimal("100")
    return discount_value


def line_subtotal(item: SalesOrderItem) -> Decimal:
    line_total = item.qty * item.unit_price
    discount = line_discount_amount(item.qty, item.unit_price, item.discount_type, item.discount_value)
    return line_total - discount


def get_order_totals(order: SalesOrder) -> dict:
    items_total = sum((item.qty * item.unit_price for item in order.items), Decimal("0"))
    total_discount = sum(
        (
            line_discount_amount(i.qty, i.unit_price, i.discount_type, i.discount_value)
            for i in order.items
        ),
        Decimal("0"),
    )
    total = items_total - total_discount + order.shipping_cost
    paid = sum((p.amount for p in order.payments), Decimal("0"))
    remaining = total - paid
    return {
        "items_total": items_total,
        "total_discount": total_discount,
        "total": total,
        "paid": paid,
        "remaining": remaining,
        "payment_status": compute_payment_status(total, paid),
    }


def create_order(db: Session, payload) -> SalesOrder:
    order = SalesOrder(
        customer_id=payload.customer_id,
        order_date=payload.order_date,
        due_date=payload.due_date,
        shipping_cost=payload.shipping_cost,
        notes=payload.notes,
        status="draft",
    )
    for item_in in payload.items:
        product = db.get(Product, item_in.product_id)
        if product is None:
            raise ValueError(f"Produk {item_in.product_id} tidak ditemukan")
        order.items.append(
            SalesOrderItem(
                product_id=product.id,
                qty=item_in.qty,
                unit_price=product.selling_price,
                discount_type=item_in.discount_type,
                discount_value=item_in.discount_value,
            )
        )
    db.add(order)
    db.flush()
    order.status_logs.append(OrderStatusLog(status="draft"))
    db.commit()
    db.refresh(order)
    return order


def update_order_header(db: Session, order: SalesOrder, payload) -> None:
    order.customer_id = payload.customer_id
    order.order_date = payload.order_date
    order.due_date = payload.due_date
    order.shipping_cost = payload.shipping_cost
    order.notes = payload.notes
    db.commit()


def add_item(db: Session, order: SalesOrder, item_in) -> SalesOrderItem:
    product = db.get(Product, item_in.product_id)
    if product is None:
        raise ValueError(f"Produk {item_in.product_id} tidak ditemukan")
    item = SalesOrderItem(
        order_id=order.id,
        product_id=product.id,
        qty=item_in.qty,
        unit_price=product.selling_price,
        discount_type=item_in.discount_type,
        discount_value=item_in.discount_value,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item: SalesOrderItem, payload) -> None:
    item.qty = payload.qty
    item.unit_price = payload.unit_price
    item.discount_type = payload.discount_type
    item.discount_value = payload.discount_value
    db.commit()


def delete_item(db: Session, item: SalesOrderItem) -> None:
    db.delete(item)
    db.commit()


def update_status(db: Session, order: SalesOrder, status: str) -> None:
    order.status = status
    order.status_logs.append(OrderStatusLog(status=status))
    db.commit()


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
