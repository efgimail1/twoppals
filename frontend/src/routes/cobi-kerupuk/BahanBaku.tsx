import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2, X } from "lucide-react";
import {
  Ingredient,
  PriceHistoryEntry,
  addIngredientConversion,
  createIngredient,
  deleteIngredient,
  deleteIngredientConversion,
  deletePurchase,
  getIngredients,
  getPriceHistory,
  getPurchaseUnits,
  recordPurchase,
  updateIngredient,
  updatePurchase,
} from "../../lib/cobiKerupuk";
import { formatQty, formatRupiah, parseRupiah } from "../../lib/format";

const BASE_UNITS = [
  "gram",
  "kg",
  "ml",
  "liter",
  "pcs",
  "butir",
  "siung",
  "sdt",
  "sdm",
  "lembar",
  "ikat",
  "ruas",
];

type Tab = "info" | "purchase" | "history";

export default function BahanBaku() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("info");

  // form info & konversi
  const [editName, setEditName] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editYieldPercent, setEditYieldPercent] = useState("100");
  const [newConversionUnit, setNewConversionUnit] = useState("");
  const [newConversionQty, setNewConversionQty] = useState("");

  // form catat pembelian
  const [purchaseQty, setPurchaseQty] = useState("");
  const [purchaseUnit, setPurchaseUnit] = useState("");
  const [purchaseTotalDisplay, setPurchaseTotalDisplay] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [purchaseBrand, setPurchaseBrand] = useState("");
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);

  const { data: ingredients } = useQuery({
    queryKey: ["ingredients"],
    queryFn: getIngredients,
  });
  const selected = ingredients?.find((i) => i.id === selectedId);

  const { data: purchaseUnitOptions } = useQuery({
    queryKey: ["purchase-units", selectedId],
    queryFn: () => getPurchaseUnits(selectedId!),
    enabled: !!selectedId,
  });

  const { data: history } = useQuery({
    queryKey: ["price-history", selectedId],
    queryFn: () => getPriceHistory(selectedId!),
    enabled: !!selectedId,
  });

  // sync form info tiap kali ganti bahan terpilih
  useEffect(() => {
    if (selected) {
      setEditName(selected.name);
      setEditUnit(selected.unit);
      setEditYieldPercent(String(selected.yield_percent));
    }
  }, [selected]);

  const createMutation = useMutation({
    mutationFn: createIngredient,
    onSuccess: (newIngredient) => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      setShowNewForm(false);
      setSelectedId(newIngredient.id);
      setActiveTab("info");
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      data: Parameters<typeof updateIngredient>[1];
    }) => updateIngredient(vars.id, vars.data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteIngredient,
    onSuccess: (result, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      if (selectedId === deletedId) setSelectedId(null);
      if (!result.permanently_deleted) {
        alert(
          "Bahan ini sudah pernah dipakai di resep, jadi tidak dihapus permanen (cuma dinonaktifkan) supaya histori COGS lama tetap akurat.",
        );
      }
    },
  });

  const addConversionMutation = useMutation({
    mutationFn: () =>
      addIngredientConversion(selectedId!, {
        unit: newConversionUnit,
        to_base_qty: Number(newConversionQty),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      setNewConversionUnit("");
      setNewConversionQty("");
    },
  });

  const deleteConversionMutation = useMutation({
    mutationFn: (conversionId: number) =>
      deleteIngredientConversion(selectedId!, conversionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["ingredients"] }),
  });

  const purchaseMutation = useMutation({
    mutationFn: () =>
      recordPurchase(selectedId!, {
        purchase_qty: Number(purchaseQty),
        purchase_unit: purchaseUnit,
        total_price: parseRupiah(purchaseTotalDisplay),
        purchase_date: purchaseDate,
        brand: purchaseBrand || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({
        queryKey: ["price-history", selectedId],
      });
      resetPurchaseForm();
    },
  });

  const updateHistoryMutation = useMutation({
    mutationFn: () =>
      updatePurchase(selectedId!, editingHistoryId!, {
        purchase_qty: Number(purchaseQty),
        purchase_unit: purchaseUnit,
        total_price: parseRupiah(purchaseTotalDisplay),
        purchase_date: purchaseDate,
        brand: purchaseBrand || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({
        queryKey: ["price-history", selectedId],
      });
      resetPurchaseForm();
    },
  });

  const deleteHistoryMutation = useMutation({
    mutationFn: (historyId: number) => deletePurchase(selectedId!, historyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      queryClient.invalidateQueries({
        queryKey: ["price-history", selectedId],
      });
    },
  });

  function resetPurchaseForm() {
    setPurchaseQty("");
    setPurchaseTotalDisplay("");
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPurchaseBrand("");
    setEditingHistoryId(null);
  }

  function openEditHistory(h: PriceHistoryEntry) {
    setPurchaseQty(h.purchase_qty != null ? String(h.purchase_qty) : "");
    setPurchaseUnit(h.purchase_unit ?? selected?.unit ?? "");
    setPurchaseTotalDisplay(formatRupiah(h.total_price ?? 0));
    setPurchaseDate(h.recorded_at.slice(0, 10));
    setPurchaseBrand(h.brand ?? "");
    setEditingHistoryId(h.id);
    setActiveTab("purchase");
  }

  function openDuplicateHistory(h: PriceHistoryEntry) {
    setPurchaseQty(h.purchase_qty != null ? String(h.purchase_qty) : "");
    setPurchaseUnit(h.purchase_unit ?? selected?.unit ?? "");
    setPurchaseTotalDisplay(formatRupiah(h.total_price ?? 0));
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setPurchaseBrand(h.brand ?? "");
    setEditingHistoryId(null);
    setActiveTab("purchase");
  }

  function handleDeleteHistory(h: PriceHistoryEntry) {
    if (
      window.confirm(
        "Hapus riwayat pembelian ini? Harga terkini akan disesuaikan ke entri terbaru berikutnya.",
      )
    ) {
      deleteHistoryMutation.mutate(h.id);
    }
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name") as string,
      unit: form.get("unit") as string,
      current_price: 0,
    });
  }

  function handleSaveInfo() {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.id,
      data: {
        name: editName,
        unit: editUnit,
        current_price: selected.current_price,
        yield_percent: Number(editYieldPercent),
      },
    });
  }

  function handleDuplicateIngredient(ing: Ingredient) {
    createMutation.mutate({
      name: `${ing.name} (copy)`,
      unit: ing.unit,
      current_price: 0,
    });
  }

  function handleDeleteIngredient(ing: Ingredient) {
    if (window.confirm(`Hapus bahan "${ing.name}"?`)) {
      deleteMutation.mutate(ing.id);
    }
  }

  const filtered = (ingredients ?? []).filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div style={{ padding: 24, display: "flex", gap: 16 }}>
      {/* Sidebar list bahan */}
      <div style={{ width: 280, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>Bahan Baku</div>
          <button
            className="primary"
            style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={() => setShowNewForm((v) => !v)}
          >
            <Plus size={13} style={{ verticalAlign: -2, marginRight: 3 }} />
            Baru
          </button>
        </div>

        {showNewForm && (
          <form
            onSubmit={handleCreate}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <input name="name" placeholder="Nama bahan" required />
            <select name="unit" required defaultValue="gram">
              {BASE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <button type="submit" className="primary">
              Simpan
            </button>
          </form>
        )}

        <input
          placeholder="Cari bahan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <div
          style={{
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {filtered.map((ing) => (
            <div
              key={ing.id}
              onClick={() => {
                setSelectedId(ing.id);
                setActiveTab("info");
              }}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--color-border)",
                cursor: "pointer",
                background:
                  selectedId === ing.id
                    ? "var(--color-accent-bg)"
                    : "transparent",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: selectedId === ing.id ? 500 : 400,
                  color:
                    selectedId === ing.id
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                }}
              >
                {ing.name}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: 2,
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color:
                      selectedId === ing.id
                        ? "var(--color-accent)"
                        : "var(--color-text-muted)",
                  }}
                >
                  {ing.unit}
                  {ing.yield_percent < 100 && ` · yield ${ing.yield_percent}%`}
                </span>
                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 500,
                    color:
                      selectedId === ing.id
                        ? "var(--color-accent)"
                        : "var(--color-text-primary)",
                  }}
                >
                  {ing.current_price > 0
                    ? `Rp ${formatRupiah(ing.current_price)}`
                    : "-"}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-text-muted)",
              }}
            >
              Belum ada bahan.
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected ? (
        <div
          style={{
            flex: 1,
            background: "var(--color-surface-2)",
            border: "1px solid var(--color-border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 20px 0" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              <div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {selected.name}
                </div>
                <div
                  style={{ fontSize: 12, color: "var(--color-text-secondary)" }}
                >
                  Satuan dasar: {selected.unit}
                </div>
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                <button
                  className="icon-btn"
                  title="Duplikat"
                  onClick={() => handleDuplicateIngredient(selected)}
                >
                  <Copy size={14} />
                </button>
                <button
                  className="icon-btn danger"
                  title="Hapus"
                  onClick={() => handleDeleteIngredient(selected)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 4,
                marginTop: 16,
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              {(
                [
                  ["info", "Info & Konversi"],
                  ["purchase", "Catat Pembelian"],
                  [
                    "history",
                    `Riwayat Harga${history?.length ? ` (${history.length})` : ""}`,
                  ],
                ] as [Tab, string][]
              ).map(([tab, label]) => (
                <div
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontSize: 13,
                    fontWeight: activeTab === tab ? 500 : 400,
                    padding: "10px 16px",
                    borderBottom:
                      activeTab === tab
                        ? "2px solid var(--color-accent)"
                        : "2px solid transparent",
                    color:
                      activeTab === tab
                        ? "var(--color-text-primary)"
                        : "var(--color-text-secondary)",
                    cursor: "pointer",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 20 }}>
            {activeTab === "info" && (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 24,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        marginBottom: 10,
                      }}
                    >
                      Detail bahan
                    </div>
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
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleSaveInfo}
                      style={{ width: "100%", marginBottom: 12 }}
                    />
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Satuan dasar
                    </label>
                    <select
                      value={editUnit}
                      onChange={(e) => {
                        setEditUnit(e.target.value);
                        setTimeout(handleSaveInfo, 0);
                      }}
                      style={{ width: "100%", marginBottom: 12 }}
                    >
                      {BASE_UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Yield % (rendemen)
                    </label>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        type="number"
                        value={editYieldPercent}
                        onChange={(e) => setEditYieldPercent(e.target.value)}
                        onBlur={handleSaveInfo}
                        style={{ width: 90 }}
                      />
                      <span
                        style={{
                          fontSize: 12.5,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {Number(editYieldPercent) >= 100
                          ? "% — tidak ada bagian terbuang"
                          : "% dari berat beli yang bisa dipakai"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "var(--color-text-secondary)",
                        textTransform: "uppercase",
                        letterSpacing: "0.02em",
                        marginBottom: 10,
                      }}
                    >
                      Satuan alternatif
                    </div>
                    {selected.conversions.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "var(--color-surface-1)",
                          borderRadius: 8,
                          padding: "8px 12px",
                          marginBottom: 6,
                        }}
                      >
                        <span style={{ fontSize: 12.5 }}>
                          1 {c.unit} = {formatQty(c.to_base_qty)}{" "}
                          {selected.unit}
                        </span>
                        <button
                          className="icon-btn danger"
                          onClick={() => deleteConversionMutation.mutate(c.id)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <select
                        value={newConversionUnit}
                        onChange={(e) => setNewConversionUnit(e.target.value)}
                        style={{ flex: 1 }}
                      >
                        <option value="">Pilih satuan</option>
                        {BASE_UNITS.filter((u) => u !== selected.unit).map(
                          (u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ),
                        )}
                      </select>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          fontSize: 12.5,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        =
                      </span>
                      <input
                        type="number"
                        placeholder={selected.unit}
                        value={newConversionQty}
                        onChange={(e) => setNewConversionQty(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="primary"
                        disabled={
                          !newConversionUnit ||
                          !newConversionQty ||
                          addConversionMutation.isPending
                        }
                        onClick={() => addConversionMutation.mutate()}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Harga berlaku sekarang
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 500 }}>
                      {selected.current_price > 0
                        ? `Rp ${formatRupiah(selected.current_price)}`
                        : "-"}
                      /{selected.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Dipakai di resep sebagai
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        color: "var(--color-accent)",
                      }}
                    >
                      Rp {formatRupiah(selected.effective_price)}/
                      {selected.unit} (yield {selected.yield_percent}%)
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "purchase" && (
              <div>
                {editingHistoryId ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--color-accent-bg)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      marginBottom: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12.5,
                        color: "var(--color-accent)",
                        fontWeight: 500,
                      }}
                    >
                      Sedang mengedit riwayat tanggal{" "}
                      {new Date(purchaseDate).toLocaleDateString("id-ID")}
                    </span>
                    <button
                      type="button"
                      onClick={resetPurchaseForm}
                      style={{ fontSize: 11.5, padding: "4px 10px" }}
                    >
                      Batal edit
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--color-text-muted)",
                      marginBottom: 14,
                    }}
                  >
                    Mengisi form ini akan menambah <b>riwayat pembelian baru</b>
                    .
                  </div>
                )}

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    maxWidth: 560,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Tanggal pembelian
                    </label>
                    <input
                      type="date"
                      value={purchaseDate}
                      onChange={(e) => setPurchaseDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Merk (opsional)
                    </label>
                    <input
                      value={purchaseBrand}
                      onChange={(e) => setPurchaseBrand(e.target.value)}
                      placeholder="ex: Bimoli"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Jumlah beli
                    </label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        type="number"
                        value={purchaseQty}
                        onChange={(e) => setPurchaseQty(e.target.value)}
                        placeholder="ex: 5"
                        style={{ flex: 1 }}
                      />
                      <select
                        value={purchaseUnit}
                        onChange={(e) => setPurchaseUnit(e.target.value)}
                        style={{ width: 100 }}
                      >
                        <option value="">Satuan</option>
                        {(purchaseUnitOptions?.options ?? [selected.unit]).map(
                          (u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Total harga bayar
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
                        value={purchaseTotalDisplay}
                        onChange={(e) =>
                          setPurchaseTotalDisplay(formatRupiah(e.target.value))
                        }
                        placeholder="0"
                        inputMode="numeric"
                        style={{ flex: 1, borderRadius: "0 6px 6px 0" }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  className="primary"
                  disabled={
                    !purchaseQty ||
                    !purchaseUnit ||
                    !purchaseTotalDisplay ||
                    purchaseMutation.isPending ||
                    updateHistoryMutation.isPending
                  }
                  onClick={() =>
                    editingHistoryId
                      ? updateHistoryMutation.mutate()
                      : purchaseMutation.mutate()
                  }
                  style={{ marginTop: 16, maxWidth: 560, width: "100%" }}
                >
                  {purchaseMutation.isPending || updateHistoryMutation.isPending
                    ? "Menyimpan..."
                    : editingHistoryId
                      ? "Simpan perubahan"
                      : "Simpan & update harga"}
                </button>
              </div>
            )}

            {activeTab === "history" && (
              <div>
                {history?.map((h) => (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 12.5,
                      padding: "10px 0",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    <div>
                      <div style={{ color: "var(--color-text-secondary)" }}>
                        {new Date(h.recorded_at).toLocaleDateString("id-ID")}
                        {h.purchase_qty != null &&
                          ` — beli ${formatQty(h.purchase_qty)} ${h.purchase_unit}${h.brand ? ` (${h.brand})` : ""} / Rp ${formatRupiah(h.total_price ?? 0)}`}
                      </div>
                      <div style={{ fontWeight: 500 }}>
                        Rp {formatRupiah(h.price)}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 2 }}>
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEditHistory(h)}
                      >
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        className="icon-btn"
                        title="Duplikat"
                        onClick={() => openDuplicateHistory(h)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="icon-btn danger"
                        title="Hapus"
                        onClick={() => handleDeleteHistory(h)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
                {!history?.length && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--color-text-muted)",
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    Belum ada histori pembelian.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--color-text-muted)",
            fontSize: 13,
          }}
        >
          Pilih bahan di kiri untuk lihat detailnya.
        </div>
      )}
    </div>
  );
}
