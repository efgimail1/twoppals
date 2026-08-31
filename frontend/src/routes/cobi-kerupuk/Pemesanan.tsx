import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { ORDER_STATUSES, SalesOrderListItem, deleteOrder, getOrders } from "../../lib/orders";
import { formatRupiah } from "../../lib/format";

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

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  belum_bayar: { label: "Belum bayar", color: "var(--color-danger)" },
  dp: { label: "DP", color: "var(--color-warning)" },
  lunas: { label: "Lunas", color: "var(--color-success)" },
};

export default function Pemesanan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: orders } = useQuery({
    queryKey: ["orders", statusFilter],
    queryFn: () => getOrders(statusFilter ?? undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });

  const filteredOrders = (orders ?? []).filter((o) => o.customer_name.toLowerCase().includes(search.toLowerCase()));

  function handleDelete(o: SalesOrderListItem, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Hapus order #${o.id} - ${o.customer_name}?`)) {
      deleteMutation.mutate(o.id);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Pemesanan</h2>
        <button className="primary" onClick={() => navigate("/cobi-kerupuk/pemesanan/baru")}>
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
          <div>Order</div><div>Customer</div><div>Kirim</div><div>Total</div><div>Bayar</div><div>Status</div><div></div>
        </div>
        {filteredOrders.map((o) => (
          <div
            key={o.id}
            onClick={() => navigate(`/cobi-kerupuk/pemesanan/${o.id}`)}
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
              <button
                className="icon-btn"
                title="Lihat"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/cobi-kerupuk/pemesanan/${o.id}`);
                }}
              >
                <Pencil size={14} />
              </button>
              <button className="icon-btn danger" title="Hapus" onClick={(e) => handleDelete(o, e)}>
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
    </div>
  );
}
