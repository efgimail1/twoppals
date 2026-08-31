import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import {
  DiscountType,
  ORDER_STATUSES,
  OrderItemInput,
  addOrderItem,
  addPayment,
  createOrder,
  deleteOrderItem,
  getCustomers,
  getOrder,
  updateOrderHeader,
  updateOrderItem,
  updateOrderStatus,
} from "../../lib/orders";
import { Product, getProducts } from "../../lib/cobiKerupuk";
import { formatRupiah, parseRupiah } from "../../lib/format";
import SearchableSelect from "../../components/SearchableSelect";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  dikonfirmasi: "Dikonfirmasi",
  diproses: "Diproses",
  siap: "Siap",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  draft: { bg: "var(--color-surface-1)", text: "var(--color-text-secondary)" },
  dikonfirmasi: { bg: "var(--color-accent-bg)", text: "var(--color-accent)" },
  diproses: { bg: "var(--color-warning-bg)", text: "var(--color-warning)" },
  siap: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
  dikirim: { bg: "var(--color-accent-bg)", text: "var(--color-accent)" },
  selesai: { bg: "var(--color-success-bg)", text: "var(--color-success)" },
  dibatalkan: { bg: "var(--color-danger-bg)", text: "var(--color-danger)" },
};

interface DraftItem {
  product_id: number;
  qty: string;
  discount_type: DiscountType;
  discount_value: string;
}

function lineSubtotalPreview(
  product: Product | undefined,
  qty: string,
  discountType: DiscountType,
  discountValue: string
): number {
  if (!product) return 0;
  const lineTotal = Number(product.selling_price) * Number(qty || 0);
  const discount = discountType === "percent" ? (lineTotal * Number(discountValue || 0)) / 100 : Number(discountValue || 0);
  return lineTotal - discount;
}

export default function PemesananForm() {
  const { id } = useParams();
  const orderId = id ? Number(id) : null;
  const isCreate = orderId === null;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: getCustomers });
  const { data: products } = useQuery({ queryKey: ["products-all"], queryFn: () => getProducts() });
  const { data: order } = useQuery({
    queryKey: ["order-detail", orderId],
    queryFn: () => getOrder(orderId as number),
    enabled: !isCreate,
  });

  const [customerId, setCustomerId] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [shippingDisplay, setShippingDisplay] = useState("");
  const [notes, setNotes] = useState("");

  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);

  const [newItemProductId, setNewItemProductId] = useState<number | "">("");
  const [newItemQty, setNewItemQty] = useState("");

  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("cash");

  useEffect(() => {
    if (order) {
      setCustomerId(order.customer_id);
      setOrderDate(order.order_date);
      setDueDate(order.due_date);
      setShippingDisplay(formatRupiah(order.shipping_cost));
      setNotes(order.notes ?? "");
    }
  }, [order]);

  const createMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/cobi-kerupuk/pemesanan/${newOrder.id}`, { replace: true });
    },
  });

  const headerMutation = useMutation({
    mutationFn: () =>
      updateOrderHeader(orderId as number, {
        customer_id: customerId as number,
        order_date: orderDate,
        due_date: dueDate,
        shipping_cost: parseRupiah(shippingDisplay || "0"),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (item: OrderItemInput) => addOrderItem(orderId as number, item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      setNewItemProductId("");
      setNewItemQty("");
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (vars: { itemId: number; data: Parameters<typeof updateOrderItem>[2] }) =>
      updateOrderItem(orderId as number, vars.itemId, vars.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] }),
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => deleteOrderItem(orderId as number, itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] }),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => updateOrderStatus(orderId as number, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: () =>
      addPayment(orderId as number, {
        amount: parseRupiah(paymentAmountDisplay),
        payment_date: paymentDate,
        method: paymentMethod,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-detail", orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setPaymentAmountDisplay("");
    },
  });

  function addDraftItem() {
    if (!products || products.length === 0) return;
    setDraftItems((prev) => [
      ...prev,
      { product_id: products[0].id, qty: "", discount_type: "percent", discount_value: "" },
    ]);
  }

  function updateDraftItem(index: number, field: keyof DraftItem, value: string) {
    setDraftItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        if (field === "product_id") return { ...it, product_id: Number(value) };
        if (field === "discount_type") return { ...it, discount_type: value as DiscountType };
        return { ...it, [field]: value };
      })
    );
  }

  function removeDraftItem(index: number) {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleSubmitCreate() {
    const items: OrderItemInput[] = draftItems
      .filter((it) => Number(it.qty) > 0)
      .map((it) => ({
        product_id: it.product_id,
        qty: Number(it.qty),
        discount_type: it.discount_type,
        discount_value: Number(it.discount_value || 0),
      }));
    createMutation.mutate({
      customer_id: customerId as number,
      order_date: orderDate,
      due_date: dueDate,
      shipping_cost: parseRupiah(shippingDisplay || "0"),
      notes: notes || undefined,
      items,
    });
  }

  function handleAddItemToExistingOrder() {
    if (!newItemProductId || !newItemQty) return;
    addItemMutation.mutate({
      product_id: newItemProductId as number,
      qty: Number(newItemQty),
      discount_type: "percent",
      discount_value: 0,
    });
  }

  const customerOptions = (customers ?? []).map((c) => ({
    value: c.id,
    label: c.name,
    sublabel: c.phone ?? undefined,
  }));

  const draftSubtotal = draftItems.reduce((sum, it) => {
    const product = products?.find((p) => p.id === it.product_id);
    return sum + lineSubtotalPreview(product, it.qty, it.discount_type, it.discount_value);
  }, 0);
  const draftShipping = parseRupiah(shippingDisplay || "0");
  const draftTotal = draftSubtotal + draftShipping;

  if (!isCreate && !order) {
    return <div style={{ padding: 24, fontSize: 13, color: "var(--color-text-muted)" }}>Memuat...</div>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div
        onClick={() => navigate("/cobi-kerupuk/pemesanan")}
        style={{ fontSize: 12, color: "var(--color-text-muted)", cursor: "pointer", marginBottom: 16 }}
      >
        ← Kembali ke daftar pemesanan
      </div>

      {!isCreate && order && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <select
            value={order.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            style={{
              fontSize: 12.5,
              padding: "6px 12px",
              borderRadius: 20,
              border: "none",
              background: STATUS_COLORS[order.status].bg,
              color: STATUS_COLORS[order.status].text,
              fontWeight: 500,
            }}
          >
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      )}

      <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 24, marginBottom: 16 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>ORDER</div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>{isCreate ? "Baru" : `#${order?.id}`}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, paddingBottom: 20, borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Customer</label>
            <SearchableSelect
              options={customerOptions}
              value={customerId}
              onChange={(v) => {
                setCustomerId(v);
                if (!isCreate) setTimeout(() => headerMutation.mutate(), 0);
              }}
              placeholder="Cari customer..."
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Tanggal Order</label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              onBlur={() => !isCreate && headerMutation.mutate()}
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Tanggal Kirim</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => !isCreate && headerMutation.mutate()}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "var(--color-text-muted)", textAlign: "left" }}>
                <th style={{ fontWeight: 400, padding: "6px 4px", width: 24 }}>#</th>
                <th style={{ fontWeight: 400, padding: "6px 4px" }}>Item</th>
                <th style={{ fontWeight: 400, padding: "6px 4px", textAlign: "right" }}>Qty</th>
                <th style={{ fontWeight: 400, padding: "6px 4px", textAlign: "right" }}>Harga satuan</th>
                <th style={{ fontWeight: 400, padding: "6px 4px", textAlign: "right" }}>Diskon</th>
                <th style={{ fontWeight: 400, padding: "6px 4px", textAlign: "right" }}>Subtotal</th>
                <th style={{ width: 20 }}></th>
              </tr>
            </thead>
            <tbody>
              {isCreate
                ? draftItems.map((it, i) => {
                    const product = products?.find((p) => p.id === it.product_id);
                    return (
                      <tr key={i} style={{ borderTop: "1px solid var(--color-border)" }}>
                        <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>{i + 1}</td>
                        <td style={{ padding: "8px 4px" }}>
                          <select
                            value={it.product_id}
                            onChange={(e) => updateDraftItem(i, "product_id", e.target.value)}
                            style={{ width: "100%", fontSize: 12.5 }}
                          >
                            {products?.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.variant_label ?? ""} {p.size_label ?? ""}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>
                          <input
                            type="number"
                            value={it.qty}
                            onChange={(e) => updateDraftItem(i, "qty", e.target.value)}
                            style={{ width: 60, textAlign: "right" }}
                          />
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>
                          {product ? `Rp ${formatRupiah(product.selling_price)}` : "-"}
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                            <input
                              value={it.discount_value}
                              onChange={(e) => updateDraftItem(i, "discount_value", e.target.value)}
                              style={{ width: 50, textAlign: "right", padding: 4 }}
                            />
                            <select
                              value={it.discount_type}
                              onChange={(e) => updateDraftItem(i, "discount_type", e.target.value)}
                              style={{ padding: 4, fontSize: 11 }}
                            >
                              <option value="percent">%</option>
                              <option value="amount">Rp</option>
                            </select>
                          </span>
                        </td>
                        <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 500 }}>
                          Rp {formatRupiah(lineSubtotalPreview(product, it.qty, it.discount_type, it.discount_value))}
                        </td>
                        <td>
                          <span onClick={() => removeDraftItem(i)} style={{ cursor: "pointer", color: "var(--color-text-muted)" }}>✕</span>
                        </td>
                      </tr>
                    );
                  })
                : order?.items.map((it, i) => (
                    <tr key={it.id} style={{ borderTop: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "8px 4px", color: "var(--color-text-muted)" }}>{i + 1}</td>
                      <td style={{ padding: "8px 4px" }}>{it.product_name}</td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <input
                          type="number"
                          defaultValue={it.qty}
                          onBlur={(e) =>
                            updateItemMutation.mutate({
                              itemId: it.id,
                              data: {
                                qty: Number(e.target.value),
                                unit_price: it.unit_price,
                                discount_type: it.discount_type,
                                discount_value: it.discount_value,
                              },
                            })
                          }
                          style={{ width: 60, textAlign: "right" }}
                        />
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <input
                          defaultValue={formatRupiah(it.unit_price)}
                          onBlur={(e) =>
                            updateItemMutation.mutate({
                              itemId: it.id,
                              data: {
                                qty: it.qty,
                                unit_price: parseRupiah(e.target.value),
                                discount_type: it.discount_type,
                                discount_value: it.discount_value,
                              },
                            })
                          }
                          style={{ width: 90, textAlign: "right" }}
                        />
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                          <input
                            defaultValue={it.discount_value}
                            onBlur={(e) =>
                              updateItemMutation.mutate({
                                itemId: it.id,
                                data: {
                                  qty: it.qty,
                                  unit_price: it.unit_price,
                                  discount_type: it.discount_type,
                                  discount_value: Number(e.target.value),
                                },
                              })
                            }
                            style={{ width: 50, textAlign: "right", padding: 4 }}
                          />
                          <select
                            defaultValue={it.discount_type}
                            onChange={(e) =>
                              updateItemMutation.mutate({
                                itemId: it.id,
                                data: {
                                  qty: it.qty,
                                  unit_price: it.unit_price,
                                  discount_type: e.target.value as DiscountType,
                                  discount_value: it.discount_value,
                                },
                              })
                            }
                            style={{ padding: 4, fontSize: 11 }}
                          >
                            <option value="percent">%</option>
                            <option value="amount">Rp</option>
                          </select>
                        </span>
                      </td>
                      <td style={{ padding: "8px 4px", textAlign: "right", fontWeight: 500 }}>
                        Rp {formatRupiah(it.subtotal)}
                      </td>
                      <td>
                        <span onClick={() => deleteItemMutation.mutate(it.id)} style={{ cursor: "pointer", color: "var(--color-text-muted)" }}>
                          <Trash2 size={13} />
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>

          {isCreate ? (
            <div onClick={addDraftItem} style={{ fontSize: 12, color: "var(--color-accent)", marginTop: 8, cursor: "pointer" }}>
              + Tambah baris item
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6, marginTop: 10, alignItems: "center" }}>
              <select
                value={newItemProductId}
                onChange={(e) => setNewItemProductId(e.target.value ? Number(e.target.value) : "")}
                style={{ flex: 2, fontSize: 12.5 }}
              >
                <option value="">Pilih produk...</option>
                {products?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.variant_label ?? ""} {p.size_label ?? ""}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Qty"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                style={{ width: 70 }}
              />
              <button onClick={handleAddItemToExistingOrder} disabled={!newItemProductId || !newItemQty}>
                + Tambah
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Ongkos kirim</label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ padding: "8px 10px", border: "1px solid var(--color-border)", borderRight: "none", borderRadius: "6px 0 0 6px", background: "var(--color-surface-1)", fontSize: 13 }}>
                Rp
              </span>
              <input
                value={shippingDisplay}
                onChange={(e) => setShippingDisplay(formatRupiah(e.target.value))}
                onBlur={() => !isCreate && headerMutation.mutate()}
                placeholder="0"
                inputMode="numeric"
                style={{ flex: 1, borderRadius: "0 6px 6px 0" }}
              />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Catatan</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => !isCreate && headerMutation.mutate()}
              style={{ width: "100%" }}
            />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <div style={{ width: 260 }}>
            {isCreate ? (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 500, padding: "8px 0" }}>
                <span>Total</span><span>Rp {formatRupiah(draftTotal)}</span>
              </div>
            ) : order ? (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0" }}>
                  <span>Subtotal</span><span>Rp {formatRupiah(order.items_total)}</span>
                </div>
                {order.total_discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", color: "var(--color-danger)" }}>
                    <span>Total diskon</span><span>- Rp {formatRupiah(order.total_discount)}</span>
                  </div>
                )}
                {order.shipping_cost > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0" }}>
                    <span>Ongkos kirim</span><span>Rp {formatRupiah(order.shipping_cost)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 500, padding: "8px 0", borderTop: "1px solid var(--color-border)", marginTop: 6 }}>
                  <span>Total</span><span>Rp {formatRupiah(order.total)}</span>
                </div>
              </>
            ) : null}
          </div>
        </div>

        {isCreate && (
          <button
            className="primary"
            disabled={!customerId || !dueDate || draftItems.length === 0 || createMutation.isPending}
            onClick={handleSubmitCreate}
            style={{ marginTop: 16, width: "100%" }}
          >
            {createMutation.isPending ? "Menyimpan..." : "Simpan pesanan"}
          </button>
        )}
      </div>

      {!isCreate && order && (
        <>
          <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Pembayaran</div>
              <div style={{ fontSize: 12.5, color: order.remaining > 0 ? "var(--color-warning)" : "var(--color-success)" }}>
                {order.remaining > 0 ? `Sisa Rp ${formatRupiah(order.remaining)}` : "Lunas"}
              </div>
            </div>
            {order.payments.map((p) => (
              <div key={p.id} style={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--color-border)" }}>
                <span>{new Date(p.payment_date).toLocaleDateString("id-ID")} · {p.method}</span>
                <span style={{ fontWeight: 500 }}>Rp {formatRupiah(p.amount)}</span>
              </div>
            ))}
            {!order.payments.length && (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)", padding: "6px 0" }}>Belum ada pembayaran.</div>
            )}

            {order.remaining > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--color-border)" }}>
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
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  style={{ width: "100%", marginBottom: 8 }}
                />
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

          <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Riwayat status</div>
            {order.status_logs.map((log, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "5px 0", color: "var(--color-text-secondary)" }}>
                <span>{STATUS_LABELS[log.status]}</span>
                <span>{new Date(log.changed_at).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
