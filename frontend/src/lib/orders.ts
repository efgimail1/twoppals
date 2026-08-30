import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

export interface Customer {
  id: number;
  name: string;
  phone: string | null;
  address: string | null;
  order_count: number;
}

export interface OrderItemInput {
  product_id: number;
  qty: number;
}

export interface OrderItemOut {
  id: number;
  product_id: number;
  product_name: string;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface PaymentOut {
  id: number;
  amount: number;
  payment_date: string;
  method: string;
  notes: string | null;
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
  items_total: number;
  remaining: number;
}

export const ORDER_STATUSES = ["draft", "dikonfirmasi", "siap", "selesai", "dibatalkan"] as const;

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
  due_date: string;
  shipping_cost: number;
  notes?: string;
  items: OrderItemInput[];
}) => apiPost<SalesOrderDetail>("/cobi-kerupuk/orders", data);

export const updateOrderStatus = (id: number, status: string) =>
  apiPatch<SalesOrderDetail>(`/cobi-kerupuk/orders/${id}/status`, { status });

export const deleteOrder = (id: number) => apiDelete(`/cobi-kerupuk/orders/${id}`);

export const addPayment = (
  orderId: number,
  data: { amount: number; payment_date?: string; method: string; notes?: string }
) => apiPost<SalesOrderDetail>(`/cobi-kerupuk/orders/${orderId}/payments`, data);
