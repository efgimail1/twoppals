import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Plus, Sparkles, X, Zap, Trash2 } from "lucide-react";
import {
  OverheadItemInput,
  getOverheadByMonth,
  listOverheads,
  saveOverhead,
  deleteOverhead,
} from "../../lib/cobiKerupuk";
import {
  formatNumber,
  formatRupiah,
  parseNumber,
  parseRupiah,
} from "../../lib/format";

function overheadIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("gas"))
    return <Flame size={14} style={{ color: "var(--color-warning)" }} />;
  if (lower.includes("listrik"))
    return <Zap size={14} style={{ color: "var(--color-accent)" }} />;
  return (
    <Sparkles size={14} style={{ color: "var(--color-text-secondary)" }} />
  );
}

function overheadIconBg(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("gas")) return "var(--color-warning-bg)";
  if (lower.includes("listrik")) return "var(--color-accent-bg)";
  return "var(--color-surface-1)";
}

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const names = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  return `${names[Number(m) - 1]} ${year}`;
}

export default function OverheadPage() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr());
  const [production, setProduction] = useState("");
  const [items, setItems] = useState<{ name: string; amountDisplay: string }[]>(
    [{ name: "", amountDisplay: "" }],
  );

  const { data: overheadList } = useQuery({
    queryKey: ["overhead-list"],
    queryFn: listOverheads,
  });
  const { data: monthDetail } = useQuery({
    queryKey: ["overhead-month", selectedMonth],
    queryFn: () => getOverheadByMonth(selectedMonth),
  });

  useEffect(() => {
    if (monthDetail) {
      setProduction(formatNumber(monthDetail.estimated_production_grams));
      setItems(
        monthDetail.items.map((i) => ({
          name: i.name,
          amountDisplay: formatRupiah(i.amount),
        })),
      );
    } else {
      setProduction("");
      setItems([{ name: "", amountDisplay: "" }]);
    }
  }, [monthDetail]);

  const saveMutation = useMutation({
    mutationFn: () =>
      saveOverhead({
        month: selectedMonth,
        estimated_production_grams: parseNumber(production),
        items: items
          .filter((i) => i.name.trim())
          .map(
            (i): OverheadItemInput => ({
              name: i.name,
              amount: parseRupiah(i.amountDisplay),
            }),
          ),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overhead-list"] });
      queryClient.invalidateQueries({
        queryKey: ["overhead-month", selectedMonth],
      });
      queryClient.invalidateQueries({ queryKey: ["product-cogs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteOverhead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overhead-list"] });
      queryClient.invalidateQueries({
        queryKey: ["overhead-month", selectedMonth],
      });
      setSelectedMonth(currentMonthStr());
    },
  });

  function handleDelete(month: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Hapus catatan overhead ${monthLabel(month)}?`)) {
      deleteMutation.mutate(month);
    }
  }

  function updateItem(
    index: number,
    field: "name" | "amountDisplay",
    value: string,
  ) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: field === "amountDisplay" ? formatRupiah(value) : value,
            }
          : item,
      ),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { name: "", amountDisplay: "" }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  const totalCost = items.reduce(
    (sum, i) => sum + parseRupiah(i.amountDisplay),
    0,
  );
  const perGram =
    production && parseNumber(production) > 0
      ? totalCost / parseNumber(production)
      : 0;

  const latestMonth = overheadList?.[0]?.month;

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Overhead Bulanan</h2>
        <button
          className="primary"
          onClick={() => {
            const now = currentMonthStr();
            setSelectedMonth(now);
          }}
        >
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Catat bulan baru
        </button>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 16 }}
      >
        {/* List bulan */}
        <div>
          <div
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {overheadList?.map((o) => (
              <div
                key={o.id}
                onClick={() => setSelectedMonth(o.month)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1fr 40px",
                  gap: 10,
                  padding: "12px 16px",
                  alignItems: "center",
                  borderTop: "1px solid var(--color-border)",
                  cursor: "pointer",
                  background:
                    selectedMonth === o.month
                      ? "var(--color-accent-bg)"
                      : "transparent",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: selectedMonth === o.month ? 500 : 400,
                    color:
                      selectedMonth === o.month
                        ? "var(--color-accent)"
                        : "var(--color-text-primary)",
                  }}
                >
                  {monthLabel(o.month)}{" "}
                  {o.month === latestMonth && (
                    <span style={{ fontSize: 10, marginLeft: 4 }}>● aktif</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color:
                      selectedMonth === o.month
                        ? "var(--color-accent)"
                        : "var(--color-text-secondary)",
                  }}
                >
                  Rp {formatRupiah(o.total_cost)}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color:
                      selectedMonth === o.month
                        ? "var(--color-accent)"
                        : "var(--color-text-primary)",
                  }}
                >
                  Rp {Number(o.overhead_per_gram).toFixed(2)}/g
                </div>
                <button
                  className="icon-btn danger"
                  title="Hapus"
                  onClick={(e) => handleDelete(o.month, e)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {!overheadList?.length && (
              <div
                style={{
                  padding: 20,
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--color-text-muted)",
                }}
              >
                Belum ada catatan overhead.
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 11.5,
              color: "var(--color-text-muted)",
            }}
          >
            💡 Kalau bulan berjalan belum dicatat, sistem otomatis pakai
            overhead bulan terakhir yang tersedia untuk hitung COGS.
          </div>
        </div>

        {/* Detail bulan terpilih */}
        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 500 }}>
              {monthLabel(selectedMonth)}
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ fontSize: 12.5 }}
            />
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              marginBottom: 16,
            }}
          >
            {selectedMonth === latestMonth
              ? "Sedang aktif dipakai untuk kalkulasi COGS"
              : "Bukan bulan paling baru"}
          </div>

          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.02em",
            }}
          >
            Rincian biaya
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginBottom: 10,
            }}
          >
            {items.map((item, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--color-surface-1)",
                  borderRadius: 8,
                  padding: "8px 10px",
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: overheadIconBg(item.name),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {overheadIcon(item.name)}
                </div>
                <input
                  value={item.name}
                  onChange={(e) => updateItem(i, "name", e.target.value)}
                  placeholder="ex: Gas"
                  style={{
                    flex: 1.3,
                    border: "none",
                    background: "transparent",
                    fontSize: 13,
                    padding: 4,
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: "var(--color-text-muted)",
                      marginRight: 4,
                    }}
                  >
                    Rp
                  </span>
                  <input
                    value={item.amountDisplay}
                    onChange={(e) =>
                      updateItem(i, "amountDisplay", e.target.value)
                    }
                    placeholder="0"
                    inputMode="numeric"
                    style={{
                      flex: 1,
                      border: "none",
                      background: "transparent",
                      fontSize: 13,
                      fontWeight: 500,
                      padding: 4,
                      textAlign: "right",
                    }}
                  />
                </div>
                <button
                  onClick={() => removeItem(i)}
                  style={{
                    width: 24,
                    height: 24,
                    padding: 0,
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-muted)",
                    flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            style={{
              fontSize: 12.5,
              padding: "7px 12px",
              border: "1px dashed var(--color-border-strong)",
              background: "transparent",
              borderRadius: 8,
              width: "100%",
              color: "var(--color-text-secondary)",
              marginBottom: 16,
            }}
          >
            <Plus size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
            Tambah biaya lain
          </button>

          <label
            style={{
              fontSize: 12,
              color: "var(--color-text-secondary)",
              display: "block",
              marginBottom: 4,
            }}
          >
            Estimasi produksi
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <input
              value={production}
              onChange={(e) => setProduction(formatNumber(e.target.value))}
              placeholder="0"
              inputMode="numeric"
              style={{ flex: 1, textAlign: "right" }}
            />
            <span
              style={{ fontSize: 13, color: "var(--color-text-secondary)" }}
            >
              gram
            </span>
          </div>

          <div
            style={{
              background: "var(--color-surface-1)",
              borderRadius: 10,
              padding: "14px 16px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 12.5,
                padding: "4px 0",
              }}
            >
              <span style={{ color: "var(--color-text-secondary)" }}>
                Total overhead
              </span>
              <span style={{ fontWeight: 500 }}>
                Rp {formatRupiah(totalCost)}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
              }}
            >
              <span
                style={{ fontSize: 12.5, color: "var(--color-text-secondary)" }}
              >
                Overhead per gram
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 500,
                  color: "var(--color-accent)",
                }}
              >
                Rp {perGram.toFixed(2)}
              </span>
            </div>
          </div>

          <button
            className="primary"
            disabled={!production || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            style={{ width: "100%" }}
          >
            {saveMutation.isPending ? "Menyimpan..." : "Simpan overhead"}
          </button>
        </div>
      </div>
    </div>
  );
}
