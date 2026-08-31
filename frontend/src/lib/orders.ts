import { apiDelete, apiGet, apiPatch, apiPost } from "./api";

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  order_count: number;
}

export type DiscountType = "percent" | "amount";

export interface OrderItemInput {
  product_id: number;
  qty: number;
  discount_type: DiscountType;
  discount_value: number;
}

export interface OrderItemUpdateInput {
  qty: number;
  unit_price: number;
  discount_type: DiscountType;
  discount_value: number;
}

export interface OrderItemOut {
  id: number;
  product_id: number;
  product_name: string;
  qty: number;
  unit_price: number;
  discount_type: DiscountType;
  discount_value: number;
  discount_amount: number;
  subtotal: number;
}

export interface PaymentOut {
  id: number;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
}

export interface StatusLog {
  status: string;
  changed_at: string;
}

export type PaymentStatus = "belum_bayar" | "dp" | "lunas";

export interface SalesOrderListItem {
  id: number;
  customer_id: number;
  customer_name: string;
  order_date: string;
  due_date: string;
  status: string;
  total: number;
  paid: number;
  payment_status: PaymentStatus;
}

export interface SalesOrderDetail extends SalesOrderListItem {
  shipping_cost: number;
  notes: string | null;
  items: OrderItemOut[];
  payments: PaymentOut[];
  status_logs: StatusLog[];
  items_total: number;
  total_discount: number;
  remaining: number;
}

export const ORDER_STATUSES = [
  "draft",
  "dikonfirmasi",
  "diproses",
  "siap",
  "dikirim",
  "selesai",
  "dibatalkan",
] as const;

export const getCustomers = () => apiGet<Customer[]>("/cobi-kerupuk/customers");

export const createCustomer = (data: { name: string; phone?: string; address?: string }) =>
  apiPost<Customer>("/cobi-kerupuk/customers", data);

export const updateCustomer = (id: number, data: { name: string; phone?: string; address?: string }) =>
  apiPatch<Customer>(`/cobi-kerupuk/customers/${id}`, data);

export const deleteCustomer = (id: number) =>
  apiDelete<{ permanently_deleted: boolean }>(`/cobi-kerupuk/customers/${id}`);

export const getOrders = (status?: string) =>
  apiGet<SalesOrderListItem[]>(`/cobi-kerupuk/orders${status ? `?status=${status}` : ""}`);

export const getOrder = (id: number) => apiGet<SalesOrderDetail>(`/cobi-kerupuk/orders/${id}`);

export const createOrder = (data: {
  customer_id: number;
  order_date: string;
  due_date: string;
  shipping_cost: number;
  notes?: string;
  items: OrderItemInput[];
}) => apiPost<SalesOrderDetail>("/cobi-kerupuk/orders", data);

export const updateOrderHeader = (
  id: number,
  data: { customer_id: number; order_date: string; due_date: string; shipping_cost: number; notes?: string }
) => apiPatch<SalesOrderDetail>(`/cobi-kerupuk/orders/${id}`, data);

export const addOrderItem = (orderId: number, data: OrderItemInput) =>
  apiPost<SalesOrderDetail>(`/cobi-kerupuk/orders/${orderId}/items`, data);

export const updateOrderItem = (orderId: number, itemId: number, data: OrderItemUpdateInput) =>
  apiPatch<SalesOrderDetail>(`/cobi-kerupuk/orders/${orderId}/items/${itemId}`, data);

export const deleteOrderItem = (orderId: number, itemId: number) =>
  apiDelete<SalesOrderDetail>(`/cobi-kerupuk/orders/${orderId}/items/${itemId}`);

export const updateOrderStatus = (id: number, status: string) =>
  apiPatch<SalesOrderDetail>(`/cobi-kerupuk/orders/${id}/status`, { status });

export const deleteOrder = (id: number) => apiDelete(`/cobi-kerupuk/orders/${id}`);

export const addPayment = (
  orderId: number,
  data: { amount: number; payment_date?: string; method: string; notes?: string }
) => apiPost<SalesOrderDetail>(`/cobi-kerupuk/orders/${orderId}/payments`, data);
