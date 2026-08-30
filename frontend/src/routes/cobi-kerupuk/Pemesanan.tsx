import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import {
  ORDER_STATUSES,
  OrderItemInput,
  SalesOrderListItem,
  addPayment,
  createOrder,
  deleteOrder,
  getCustomers,
  getOrder,
  getOrders,
  updateOrderStatus,
} from "../../lib/orders";
import { Product, getProducts } from "../../lib/cobiKerupuk";
import { formatRupiah, parseRupiah } from "../../lib/format";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  dikonfirmasi: "Dikonfirmasi",
  siap: "Siap",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "var(--color-surface-1)", text: "var(--color-text-secondary)" },
  dikonfirmasi: { bg: "var(--color-accent-bg)", text: "var(--color-accent)" },
  siap: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
  selesai: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
  dibatalkan: { bg: "var(--color-danger-bg)", text: "var(--color-danger)" },
};

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  belum_bayar: { label: "Belum bayar", color: "var(--color-danger)" },
  dp: { label: "DP", color: "var(--color-warning)" },
  lunas: { label: "Lunas", color: "var(--color-success)" },
};

interface DraftItem {
  product_id: number;
  qty: string;
}

export default function Pemesanan() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "view">("create");
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [shippingDisplay, setShippingDisplay] = useState("");
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const { data: orders } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () => getOrders(statusFilter ?? undefined),
  });
  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: getCustomers });
  const { data: products } = useQuery({ queryKey: ["products-all"], queryFn: () => getProducts() });
  const { data: viewingOrder } = useQuery({
    queryKey: ["order-detail", viewingOrderId],
    queryFn: () => getOrder(viewingOrderId!),
    enabled: !!viewingOrderId,
  });

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      resetCreateForm();
      setDrawerOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (vars: { id: number; status: string }) => updateOrderStatus(vars.id, vars.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", viewingOrderId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setDrawerOpen(false);
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      addPayment(viewingOrderId!, {
        amount: parseRupiah(paymentAmountDisplay),
        payment_date: paymentDate,
        method: paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", viewingOrderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setPaymentAmountDisplay("");
    },
  });

  function resetCreateForm() {
    setCustomerId("");
    setDueDate("");
    setShippingDisplay("");
    setNotes("");
    setDraftItems([]);
  }

  function openCreateDrawer() {
    setMode("create");
    resetCreateForm();
    setDrawerOpen(true);
  }

  function openViewDrawer(orderId: number) {
    setMode("view");
    setViewingOrderId(orderId);
    setPaymentAmountDisplay("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setDrawerOpen(true);
  }

  function addDraftItem() {
    if (!products || products.length === 0) return;
    setDraftItems((prev) => [...prev, { product_id: products[0].id, qty: "" }]);
  }

  function updateDraftItem(index: number, field: keyof DraftItem, value: string) {
    setDraftItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: field === "product_id" ? Number(value) : value } : it))
    );
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmitCreate() {
    const items: OrderItemInput[] = draftItems
      .filter((it) => Number(it.qty) > 0)
      .map((it) => ({ product_id: it.product_id, qty: Number(it.qty) }));
    createMutation.mutate({
      customer_id: Number(customerId),
      due_date: dueDate,
      shipping_cost: parseRupiah(shippingDisplay || "0"),
      notes: notes || undefined,
      items,
    });
  }

  const draftTotal =
    draftItems.reduce((sum, it) => {
      const product = products?.find((p) => p.id === it.product_id);
      return sum + (product ? Number(product.selling_price) * Number(it.qty || 0) : 0);
    }, 0) + parseRupiah(shippingDisplay || "0");

  const filteredOrders = (orders ?? []).filter((o) => o.customer_name.toLowerCase().includes(search.toLowerCase()));

  function handleDeleteOrder(o: SalesOrderListItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Hapus order #${o.id} - ${o.customer_name}?`)) {
      deleteMutation.mutate(o.id);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Pemesanan</h2>
        <button className="primary" onClick={openCreateDrawer}>
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Pesanan baru
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <span
          onClick={() => setStatusFilter(null)}
          className="badge"
          style={{
            cursor: "pointer",
            border: "1px solid var(--color-border)",
            background: statusFilter === null ? "var(--color-accent-bg)" : "transparent",
            color: statusFilter === null ? "var(--color-accent)" : "var(--color-text-secondary)",
          }}
        >
          Semua
        </span>
        {ORDER_STATUSES.map((s) => (
          <span
            key={s}
            onClick={() => setStatusFilter(s)}
            className="badge"
            style={{
              cursor: "pointer",
              border: "1px solid var(--color-border)",
              background: statusFilter === s ? "var(--color-accent-bg)" : "transparent",
              color: statusFilter === s ? "var(--color-accent)" : "var(--color-text-secondary)",
            }}
          >
            {STATUS_LABELS[s]}
          </span>
        ))}
        <input
          placeholder="Cari nama customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: "auto", width: 220 }}
        />
      </div>

      <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "70px 1.5fr 1fr 1fr 1fr 1fr 80px",
            gap: 10,
            padding: "10px 16px",
            fontSize: 12,
            color: "var(--color-text-muted)",
            background: "var(--color-surface-1)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div>Order</div><div>Customer</div><div>Butuh</div><div>Total</div><div>Bayar</div><div>Status</div><div></div>
        </div>
        {filteredOrders.map((o) => (
          <div
            key={o.id}
            onClick={() => openViewDrawer(o.id)}
            style={{
              display: "grid",
              gridTemplateColumns: "70px 1.5fr 1fr 1fr 1fr 1fr 80px",
              gap: 10,
              padding: "12px 16px",
              alignItems: "center",
              borderTop: "1px solid var(--color-border)",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            <div style={{ color: "var(--color-text-secondary)" }}>#{o.id}</div>
            <div>{o.customer_name}</div>
            <div>{new Date(o.due_date).toLocaleDateString("id-ID")}</div>
            <div>Rp {formatRupiah(o.total)}</div>
            <div style={{ color: PAYMENT_LABELS[o.payment_status].color }}>{PAYMENT_LABELS[o.payment_status].label}</div>
            <div>
              <span className="badge" style={{ background: STATUS_COLORS[o.status].bg, color: STATUS_COLORS[o.status].text }}>
                {STATUS_LABELS[o.status]}
              </span>
            </div>
            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <button className="icon-btn" title="Lihat" onClick={() => openViewDrawer(o.id)}>
                <Pencil size={14} />
              </button>
              <button className="icon-btn danger" title="Hapus" onClick={(e) => handleDeleteOrder(o, e)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
            Belum ada pesanan.
          </div>
        )}
      </div>

      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 10 }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 440,
              background: "var(--color-surface-0)",
              boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
              zIndex: 11,
              padding: 24,
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {mode === "create" ? "Pesanan Baru" : `Order #${viewingOrderId}`}
              </div>
              <span onClick={() => setDrawerOpen(false)} style={{ cursor: "pointer", color: "var(--color-text-muted)" }}>
                <X size={18} />
              </span>
            </div>

            {mode === "create" && (
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Customer</label>
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} style={{ width: "100%", marginBottom: 14 }}>
                  <option value="">Pilih customer</option>
                  {customers?.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Tanggal butuh</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ width: "100%", marginBottom: 16 }} />

                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 10 }}>
                  Item pesanan
                </div>
                {draftItems.map((it, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
                    <select
                      value={it.product_id}
                      onChange={(e) => updateDraftItem(i, "product_id", e.target.value)}
                      style={{ flex: 2 }}
                    >
                      {products?.map((p: Product) => (
                        <option key={p.id} value={p.id}>
                          {p.name} {p.variant_label ?? ""} {p.size_label ?? ""} (Rp {formatRupiah(p.selling_price)})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Qty"
                      value={it.qty}
                      onChange={(e) => updateDraftItem(i, "qty", e.target.value)}
                      style={{ width: 70 }}
                    />
                    <button type="button" onClick={() => removeDraftItem(i)}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={addDraftItem} style={{ marginBottom: 14 }}>+ Tambah item</button>

                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
                  Ongkos kirim (opsional)
                </label>
                <div style={{ display: "flex", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRight: "none", borderRadius: "6px 0 0 6px", background: "var(--color-surface-1)", fontSize: 13 }}>
                    Rp
                  </span>
                  <input
                    value={shippingDisplay}
                    onChange={(e) => setShippingDisplay(formatRupiah(e.target.value))}
                    placeholder="0"
                    inputMode="numeric"
                    style={{ flex: 1, borderRadius: "0 6px 6px 0" }}
                  />
                </div>

                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Catatan (opsional)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} style={{ width: "100%", marginBottom: 16 }} />

                <div style={{ background: "var(--color-surface-1)", borderRadius: 10, padding: "12px 14px", marginBottom: 16, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Total pesanan</span>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>Rp {formatRupiah(draftTotal)}</span>
                </div>

                <button
                  className="primary"
                  disabled={!customerId || !dueDate || draftItems.length === 0 || createMutation.isPending}
                  onClick={handleSubmitCreate}
                  style={{ width: "100%" }}
                >
                  {createMutation.isPending ? "Menyimpan..." : "Simpan pesanan"}
                </button>
              </div>
            )}

            {mode === "view" && viewingOrder && (
              <div>
                <div style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: 4 }}>{viewingOrder.customer_name}</div>
                <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 14 }}>
                  Butuh: {new Date(viewingOrder.due_date).toLocaleDateString("id-ID")}
                </div>

                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Status</label>
                <select
                  value={viewingOrder.status}
                  onChange={(e) => statusMutation.mutate({ id: viewingOrder.id, status: e.target.value })}
                  style={{ width: "100%", marginBottom: 16 }}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>

                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 8 }}>
                  Item
                </div>
                {viewingOrder.items.map((it) => (
                  <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                    <span>{it.product_name} x{it.qty}</span>
                    <span>Rp {formatRupiah(it.subtotal)}</span>
                  </div>
                ))}
                {viewingOrder.shipping_cost > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                    <span>Ongkos kirim</span>
                    <span>Rp {formatRupiah(viewingOrder.shipping_cost)}</span>
                  </div>
                )}

                <div style={{ background: "var(--color-surface-1)", borderRadius: 10, padding: "12px 14px", margin: "14px 0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0" }}>
                    <span>Total tagihan</span><span style={{ fontWeight: 500 }}>Rp {formatRupiah(viewingOrder.total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "3px 0", color: "var(--color-success)" }}>
                    <span>Sudah dibayar</span><span>Rp {formatRupiah(viewingOrder.paid)}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      padding: "6px 0 0",
                      borderTop: "1px solid var(--color-border)",
                      marginTop: 4,
                      fontWeight: 500,
                      color: viewingOrder.remaining > 0 ? "var(--color-warning)" : "var(--color-success)",
                    }}
                  >
                    <span>Sisa tagihan</span><span>Rp {formatRupiah(viewingOrder.remaining)}</span>
                  </div>
                </div>

                <div style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", marginBottom: 8 }}>
                  Riwayat pembayaran
                </div>
                {viewingOrder.payments.map((p) => (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", color: "var(--color-text-secondary)" }}>
                    <span>{new Date(p.payment_date).toLocaleDateString("id-ID")} · {p.method}</span>
                    <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>Rp {formatRupiah(p.amount)}</span>
                  </div>
                ))}
                {!viewingOrder.payments.length && (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Belum ada pembayaran.</div>
                )}

                {viewingOrder.remaining > 0 && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8 }}>Catat pembayaran</div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                        <span style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRight: "none", borderRadius: "6px 0 0 6px", background: "var(--color-surface-1)", fontSize: 13 }}>
                          Rp
                        </span>
                        <input
                          value={paymentAmountDisplay}
                          onChange={(e) => setPaymentAmountDisplay(formatRupiah(e.target.value))}
                          placeholder="0"
                          inputMode="numeric"
                          style={{ flex: 1, borderRadius: "0 6px 6px 0" }}
                        />
                      </div>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: 100 }}>
                        <option value="cash">Tunai</option>
                        <option value="transfer">Transfer</option>
                        <option value="qris">QRIS</option>
                      </select>
                    </div>
                    <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} style={{ width: "100%", marginBottom: 8 }} />
                    <button
                      className="primary"
                      disabled={!paymentAmountDisplay || paymentMutation.isPending}
                      onClick={() => paymentMutation.mutate()}
                      style={{ width: "100%" }}
                    >
                      {paymentMutation.isPending ? "Menyimpan..." : "Catat pembayaran"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
