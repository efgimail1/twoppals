from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.cobi_kerupuk import models as cobi_models
from app.cobi_kerupuk.pemesanan import service
from app.cobi_kerupuk.pemesanan.models import Customer, SalesOrder, SalesOrderItem
from app.cobi_kerupuk.pemesanan.schemas import (
    CustomerCreate,
    CustomerOut,
    OrderItemInput,
    OrderItemOut,
    OrderItemUpdate,
    PaymentCreate,
    SalesOrderCreate,
    SalesOrderDetailOut,
    SalesOrderHeaderUpdate,
    SalesOrderListOut,
    SalesOrderUpdateStatus,
)
from app.core.dependencies import get_current_user
from app.core.models import User
from app.database import get_db

router = APIRouter()


def _customer_order_count(db: Session, customer_id: int) -> int:
    return len(db.scalars(select(SalesOrder).where(SalesOrder.customer_id == customer_id)).all())


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
    payload: CustomerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)
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

def _item_to_out(db: Session, item: SalesOrderItem) -> OrderItemOut:
    product = db.get(cobi_models.Product, item.product_id)
    name_parts = [product.name] if product else ["?"]
    if product and product.variant_label:
        name_parts.append(product.variant_label)
    if product and product.size_label:
        name_parts.append(product.size_label)
    discount_amount = service.line_discount_amount(
        item.qty, item.unit_price, item.discount_type, item.discount_value
    )
    return OrderItemOut(
        id=item.id,
        product_id=item.product_id,
        product_name=" - ".join(name_parts),
        qty=item.qty,
        unit_price=item.unit_price,
        discount_type=item.discount_type,
        discount_value=item.discount_value,
        discount_amount=discount_amount,
        subtotal=service.line_subtotal(item),
    )


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
    items_out = [_item_to_out(db, item) for item in order.items]
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
        status_logs=order.status_logs,
        **totals,
    )


@router.get("/orders", response_model=list[SalesOrderListOut])
def list_orders(
    status: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    query = select(SalesOrder).where(SalesOrder.is_active == True).order_by(SalesOrder.due_date)  # noqa: E712
    if status:
        query = query.where(SalesOrder.status == status)
    orders = db.scalars(query).all()
    return [_order_to_list_out(o) for o in orders]


@router.get("/orders/{order_id}", response_model=SalesOrderDetailOut)
def get_order(order_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    return _order_to_detail_out(db, order)


@router.post("/orders", response_model=SalesOrderDetailOut)
def create_order(
    payload: SalesOrderCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    try:
        order = service.create_order(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return _order_to_detail_out(db, order)


@router.patch("/orders/{order_id}", response_model=SalesOrderDetailOut)
def update_order_header(
    order_id: int,
    payload: SalesOrderHeaderUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    service.update_order_header(db, order, payload)
    db.refresh(order)
    return _order_to_detail_out(db, order)


@router.post("/orders/{order_id}/items", response_model=SalesOrderDetailOut)
def add_item(
    order_id: int,
    payload: OrderItemInput,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    try:
        service.add_item(db, order, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.refresh(order)
    return _order_to_detail_out(db, order)


@router.patch("/orders/{order_id}/items/{item_id}", response_model=SalesOrderDetailOut)
def update_item(
    order_id: int,
    item_id: int,
    payload: OrderItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    item = db.get(SalesOrderItem, item_id)
    if item is None or item.order_id != order_id:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    service.update_item(db, item, payload)
    db.refresh(order)
    return _order_to_detail_out(db, order)


@router.delete("/orders/{order_id}/items/{item_id}", response_model=SalesOrderDetailOut)
def delete_item(
    order_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    order = db.get(SalesOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    item = db.get(SalesOrderItem, item_id)
    if item is None or item.order_id != order_id:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    service.delete_item(db, item)
    db.refresh(order)
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
    service.update_status(db, order, payload.status)
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
    service.add_payment(db, order, payload.amount, payload.payment_date, payload.method, payload.notes)
    db.refresh(order)
    return _order_to_detail_out(db, order)
