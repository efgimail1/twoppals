from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class CustomerCreate(BaseModel):
    name: str
    phone: str | None = None
    address: str | None = None


class CustomerOut(BaseModel):
    id: int
    name: str
    phone: str | None
    address: str | None
    order_count: int = 0

    class Config:
        from_attributes = True


class OrderItemInput(BaseModel):
    product_id: int
    qty: Decimal


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    qty: Decimal
    unit_price: Decimal
    subtotal: Decimal


class SalesOrderCreate(BaseModel):
    customer_id: int
    due_date: date
    shipping_cost: Decimal = Decimal("0")
    notes: str | None = None
    items: list[OrderItemInput]


class SalesOrderUpdateStatus(BaseModel):
    status: str


class PaymentCreate(BaseModel):
    amount: Decimal
    payment_date: date | None = None
    method: str = "cash"
    notes: str | None = None


class PaymentOut(BaseModel):
    id: int
    amount: Decimal
    payment_date: date
    method: str
    notes: str | None

    class Config:
        from_attributes = True


class SalesOrderListOut(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    order_date: datetime
    due_date: date
    status: str
    total: Decimal
    paid: Decimal
    payment_status: str  # belum_bayar | dp | lunas


class SalesOrderDetailOut(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    order_date: datetime
    due_date: date
    status: str
    shipping_cost: Decimal
    notes: str | None
    items: list[OrderItemOut]
    payments: list[PaymentOut]
    items_total: Decimal
    total: Decimal
    paid: Decimal
    remaining: Decimal
    payment_status: str
