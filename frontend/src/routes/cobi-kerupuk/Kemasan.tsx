import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import {
  Packaging,
  createPackaging,
  deletePackaging,
  getPackagings,
  updatePackaging,
} from "../../lib/cobiKerupuk";
import { formatRupiah, formatRupiahInput, parseRupiah } from "../../lib/format";

const TYPES = [
  { value: "plastik", label: "Plastik" },
  { value: "label", label: "Label/stiker" },
  { value: "lainnya", label: "Lainnya" },
];

function typeLabel(type: string) {
  return TYPES.find((t) => t.value === type)?.label ?? type;
}

function typeIcon(type: string) {
  if (type === "label")
    return <Tag size={14} style={{ color: "var(--color-accent)" }} />;
  return <Package size={14} style={{ color: "var(--color-text-secondary)" }} />;
}

export default function Kemasan() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("plastik");
  const [priceDisplay, setPriceDisplay] = useState("");

  const { data: packagings } = useQuery({
    queryKey: ["packagings"],
    queryFn: getPackagings,
  });

  const createMutation = useMutation({
    mutationFn: createPackaging,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packagings"] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Parameters<typeof updatePackaging>[1] }) =>
      updatePackaging(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["packagings"] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePackaging,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["packagings"] }),
  });

  function resetForm() {
    setShowForm(false);
    setEditingId(null);
    setName("");
    setType("plastik");
    setPriceDisplay("");
  }

  function openEditForm(p: Packaging) {
    setEditingId(p.id);
    setName(p.name);
    setType(p.type);
    setPriceDisplay(formatRupiah(p.current_price));
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data = { name, type, current_price: parseRupiah(priceDisplay) };
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleDelete(p: Packaging) {
    if (window.confirm(`Hapus kemasan "${p.name}"?`)) {
      deleteMutation.mutate(p.id);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Kemasan & Label</h2>
        <button
          className="primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus size={14} style={{ verticalAlign: -2, marginRight: 4 }} />
          Kemasan baru
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "flex-end",
            marginBottom: 20,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            padding: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 2, minWidth: 180 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Nama
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Plastik OPP kecil 8x15"
              required
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 130 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Tipe
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ width: "100%" }}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                display: "block",
                marginBottom: 4,
              }}
            >
              Harga per pcs
            </label>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{
                  padding: "8px 10px",
                  border: "1px solid var(--color-border)",
                  borderRight: "none",
                  borderRadius: "6px 0 0 6px",
                  background: "var(--color-surface-1)",
                  fontSize: 13,
                }}
              >
                Rp
              </span>
              <input
                value={priceDisplay}
                onChange={(e) => setPriceDisplay(formatRupiahInput(e.target.value))}
                placeholder="0"
                inputMode="numeric"
                required
                style={{ flex: 1, borderRadius: "0 6px 6px 0" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="submit"
              className="primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "Simpan" : "Tambah"}
            </button>
            <button type="button" onClick={resetForm}>
              Batal
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr 1fr 80px",
            gap: 10,
            padding: "10px 16px",
            fontSize: 12,
            color: "var(--color-text-muted)",
            background: "var(--color-surface-1)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div>Tipe</div>
          <div>Nama</div>
          <div>Harga/pcs</div>
          <div></div>
        </div>

        {packagings?.map((p) => (
          <div
            key={p.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 2fr 1fr 80px",
              gap: 10,
              padding: "10px 16px",
              alignItems: "center",
              borderTop: "1px solid var(--color-border)",
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {typeIcon(p.type)}
              <span style={{ color: "var(--color-text-secondary)", fontSize: 12.5 }}>
                {typeLabel(p.type)}
              </span>
            </div>
            <div>{p.name}</div>
            <div style={{ fontWeight: 500 }}>Rp {formatRupiah(p.current_price)}</div>
            <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
              <button
                className="icon-btn"
                title="Edit"
                onClick={() => openEditForm(p)}
              >
                <Pencil size={13} />
              </button>
              <button
                className="icon-btn danger"
                title="Hapus"
                onClick={() => handleDelete(p)}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}

        {!packagings?.length && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            Belum ada kemasan/label. Tambah dulu supaya bisa dipakai di form
            produk.
          </div>
        )}
      </div>
    </div>
  );
}