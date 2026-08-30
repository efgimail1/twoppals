from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cobi_kerupuk.models import Product
from app.cobi_kerupuk.pemesanan import service
from app.cobi_kerupuk.pemesanan.models import Customer, SalesOrder
from app.cobi_kerupuk.pemesanan.schemas import (
    CustomerCreate,
    CustomerOut,
    OrderItemOut,
    PaymentCreate,
    SalesOrderCreate,
    SalesOrderDetailOut,
    SalesOrderListOut,
    SalesOrderUpdateStatus,
)
from app.core.dependencies import get_current_user
from app.core.models import User
from app.database import get_db

router = APIRouter()


def _customer_order_count(db: Session, customer_id: int) -> int:
    return len(
        db.scalars(
            select(SalesOrder).where(SalesOrder.customer_id == customer_id)
        ).all()
    )


def _to_customer_out(db: Session, customer: Customer) -> CustomerOut:
    return CustomerOut(
        id=customer.id,
        name=customer.name,
        phone=customer.phone,
        address=customer.address,
        order_count=_customer_order_count(db, customer.id),
    )


# ---- Customer ----


@router.get("/customers", response_model=list[CustomerOut])
def list_customers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    customers = db.scalars(select(Customer).where(Customer.is_active == True)).all()  # noqa: E712
    return [_to_customer_out(db, c) for c in customers]


@router.post("/customers", response_model=CustomerOut)
def create_customer(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    customer = Customer(**payload.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return _to_customer_out(db, customer)


@router.patch("/customers/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    payload: CustomerCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")
    customer.name = payload.name
    customer.phone = payload.phone
    customer.address = payload.address
    db.commit()
    db.refresh(customer)
    return _to_customer_out(db, customer)


@router.delete("/customers/{customer_id}")
def delete_customer(
    customer_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    """Hapus permanen kalau belum pernah ada order, soft delete kalau sudah (jaga histori)."""
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")

    if _customer_order_count(db, customer_id) > 0:
        customer.is_active = False
        db.commit()
        return {"permanently_deleted": False}

    db.delete(customer)
    db.commit()
    return {"permanently_deleted": True}


# ---- Sales Order ----


def _order_to_list_out(order: SalesOrder) -> SalesOrderListOut:
    totals = service.get_order_totals(order)
    return SalesOrderListOut(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.name,
        order_date=order.order_date,
        due_date=order.due_date,
        status=order.status,
        total=totals["total"],
        paid=totals["paid"],
        payment_status=totals["payment_status"],
    )


def _order_to_detail_out(db: Session, order: SalesOrder) -> SalesOrderDetailOut:
    totals = service.get_order_totals(order)
    items_out = []
    for item in order.items:
        product = db.get(Product, item.product_id)
        name_parts = [product.name] if product else ["?"]
        if product and product.variant_label:
            name_parts.append(product.variant_label)
        if product and product.size_label:
            name_parts.append(product.size_label)
        items_out.append(
            OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=" - ".join(name_parts),
                qty=item.qty,
                unit_price=item.unit_price,
                subtotal=item.qty * item.unit_price,
            )
        )
    return SalesOrderDetailOut(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.name,
        order_date=order.order_date,
        due_date=order.due_date,
        status=order.status,
        shipping_cost=order.shipping_cost,
        notes=order.notes,
        items=items_out,
        payments=order.payments,
        **totals,
    )


@router.get("/orders", response_model=list[SalesOrderListOut])
def list_orders(
    status: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        select(SalesOrder)
        .where(SalesOrder.is_activeTrue)
        .order_by(SalesOrder.due_date)
    )  # noqa: E712
    if status:
        query = query.where(SalesOrder.status == status)
    orders = db.scalars(query).all()
    return [_order_to_list_out(o) for o in orders]


@router.get("/orders/{order_id}", response_model=SalesOrderDetailOut)
def get_order(
    order_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    return _order_to_detail_out(db, order)


@router.post("/orders", response_model=SalesOrderDetailOut)
def create_order(
    payload: SalesOrderCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        order = service.create_order(
            db,
            payload.customer_id,
            payload.due_date,
            payload.shipping_cost,
            payload.notes,
            payload.items,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return _order_to_detail_out(db, order)


@router.patch("/orders/{order_id}/status", response_model=SalesOrderDetailOut)
def update_order_status(
    order_id: int,
    payload: SalesOrderUpdateStatus,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    if payload.status not in service.ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Status tidak valid")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return _order_to_detail_out(db, order)


@router.delete("/orders/{order_id}", status_code=204)
def delete_order(
    order_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    order.is_active = False
    db.commit()


@router.post("/orders/{order_id}/payments", response_model=SalesOrderDetailOut)
def add_payment(
    order_id: int,
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    service.add_payment(
        db, order, payload.amount, payload.payment_date, payload.method, payload.notes
    )
    db.refresh(order)
    return _order_to_detail_out(db, order)
