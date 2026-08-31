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
    discount_type: str = "percent"
    discount_value: Decimal = Decimal("0")


class OrderItemUpdate(BaseModel):
    qty: Decimal
    unit_price: Decimal
    discount_type: str = "percent"
    discount_value: Decimal = Decimal("0")


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    qty: Decimal
    unit_price: Decimal
    discount_type: str
    discount_value: Decimal
    discount_amount: Decimal
    subtotal: Decimal


class SalesOrderCreate(BaseModel):
    customer_id: int
    order_date: date
    due_date: date
    shipping_cost: Decimal = Decimal("0")
    notes: str | None = None
    items: list[OrderItemInput]


class SalesOrderHeaderUpdate(BaseModel):
    customer_id: int
    order_date: date
    due_date: date
    shipping_cost: Decimal = Decimal("0")
    notes: str | None = None


class SalesOrderUpdateStatus(BaseModel):
    status: str


class StatusLogOut(BaseModel):
    status: str
    changed_at: datetime

    class Config:
        from_attributes = True


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
    order_date: date
    due_date: date
    status: str
    total: Decimal
    paid: Decimal
    payment_status: str


class SalesOrderDetailOut(BaseModel):
    id: int
    customer_id: int
    customer_name: str
    order_date: date
    due_date: date
    status: str
    shipping_cost: Decimal
    notes: str | None
    items: list[OrderItemOut]
    payments: list[PaymentOut]
    status_logs: list[StatusLogOut]
    items_total: Decimal
    total_discount: Decimal
    total: Decimal
    paid: Decimal
    remaining: Decimal
    payment_status: str
