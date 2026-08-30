import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import {
  Ingredient,
  Product,
  RecipeGroup,
  createIngredient,
  createRecipeGroup,
  createRecipeVersion,
  deleteRecipeGroup,
  getIngredients,
  getProductCogsFull,
  getProducts,
  getRecipeGroups,
  getRecipeVersionDetail,
  getRecipeVersions,
  scaleRecipe,
  simulatePrice,
  updateRecipeGroup,
} from "../../lib/cobiKerupuk";
import { formatQty, formatRupiah } from "../../lib/format";

interface LineItem {
  ingredient_id: number;
  qty: number;
  unit: string;
}

type Tab = "bahan" | "simulasi" | "skala" | "riwayat";

export default function Resep() {
  const queryClient = useQueryClient();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("bahan");

  const [lines, setLines] = useState<LineItem[]>([]);
  const [note, setNote] = useState("");
  const [margin, setMargin] = useState(75);
  const [scaleGrams, setScaleGrams] = useState(200);
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [copyFromGroupId, setCopyFromGroupId] = useState<number | "self" | null>(null);

  const { data: groups } = useQuery({
    queryKey: ["recipe-groups"],
    queryFn: getRecipeGroups,
  });
  const { data: ingredients } = useQuery({
    queryKey: ["ingredients"],
    queryFn: getIngredients,
  });
  const { data: allProducts } = useQuery({
    queryKey: ["products-all"],
    queryFn: () => getProducts(),
  });

  const selectedGroup = groups?.find((g) => g.id === selectedGroupId);

  const { data: versions } = useQuery({
    queryKey: ["recipe-versions", selectedGroupId],
    queryFn: () => getRecipeVersions(selectedGroupId!),
    enabled: !!selectedGroupId,
  });

  const activeVersion = versions?.[0];
  const { data: activeVersionDetail } = useQuery({
    queryKey: ["recipe-version-detail", selectedGroupId, activeVersion?.id],
    queryFn: () => getRecipeVersionDetail(selectedGroupId!, activeVersion!.id),
    enabled: !!selectedGroupId && !!activeVersion,
  });

  const { data: scaleResult } = useQuery({
    queryKey: ["scale", selectedGroupId, scaleGrams],
    queryFn: () => scaleRecipe(selectedGroupId!, scaleGrams),
    enabled: !!selectedGroupId && !!activeVersion && scaleGrams > 0,
  });

  const linkedProducts = (allProducts ?? []).filter(
    (p) => p.recipe_group_id === selectedGroupId,
  );

  const cogsPerBase = activeVersionDetail?.total_cogs_snapshot ?? 0;
  const { data: priceSimulation } = useQuery({
    queryKey: ["simulate-price", cogsPerBase, margin],
    queryFn: () => simulatePrice(cogsPerBase, margin),
    enabled: cogsPerBase > 0,
  });

  const groupMutation = useMutation({
    mutationFn: createRecipeGroup,
    onSuccess: (newGroup) => {
      queryClient.invalidateQueries({ queryKey: ["recipe-groups"] });
      setShowGroupForm(false);
      setSelectedGroupId(newGroup.id);
      setActiveTab("bahan");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: deleteRecipeGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipe-groups"] });
      setSelectedGroupId(null);
    },
    onError: (err: Error) => alert(err.message),
  });

  const ingredientMutation = useMutation({
    mutationFn: createIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ingredients"] });
      setShowIngredientForm(false);
    },
  });

  const versionMutation = useMutation({
    mutationFn: () =>
      createRecipeVersion(selectedGroupId!, {
        note,
        ingredients: lines.map((l) => ({
          ingredient_id: l.ingredient_id,
          qty: l.qty,
          unit: l.unit,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["recipe-versions", selectedGroupId],
      });
      setLines([]);
      setNote("");
    },
  });

  async function handleCopyFrom(sourceGroupId: number) {
    setCopyFromGroupId(sourceGroupId);
    const sourceVersions = await getRecipeVersions(sourceGroupId);
    if (!sourceVersions.length) return;
    const detail = await getRecipeVersionDetail(
      sourceGroupId,
      sourceVersions[0].id,
    );
    setLines(
      detail.ingredients.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        qty: Number(ing.qty),
        unit: ing.unit,
      })),
    );
    setNote(
      `Disalin dari: ${groups?.find((g) => g.id === sourceGroupId)?.name}`,
    );
  }

  function handleCopyFromSelf() {
    if (!activeVersionDetail) return;
    setLines(
      activeVersionDetail.ingredients.map((ing) => ({
        ingredient_id: ing.ingredient_id,
        qty: Number(ing.qty),
        unit: ing.unit,
      })),
    );
    setNote(`Berdasarkan versi ${activeVersionDetail.version_number}`);
    setCopyFromGroupId(null);
  }

  function addLine() {
    if (!ingredients || ingredients.length === 0) return;
    setLines((prev) => [
      ...prev,
      { ingredient_id: ingredients[0].id, qty: 0, unit: ingredients[0].unit },
    ]);
  }

  function updateLine(
    index: number,
    field: keyof LineItem,
    value: string | number,
  ) {
    setLines((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  }

  function handleIngredientChange(index: number, ingredientId: number) {
    const ing = ingredients?.find((i) => i.id === ingredientId);
    setLines((prev) =>
      prev.map((l, i) =>
        i === index
          ? { ...l, ingredient_id: ingredientId, unit: ing?.unit ?? l.unit }
          : l,
      ),
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCreateGroup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    groupMutation.mutate({
      name: form.get("name") as string,
      base_yield_grams: Number(form.get("base_yield_grams")),
    });
  }

  function handleAddIngredient(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    ingredientMutation.mutate({
      name: form.get("name") as string,
      unit: form.get("unit") as string,
      current_price: 0,
    });
  }

  function handleRenameGroup() {
    if (!selectedGroup) return;
    const newName = window.prompt("Nama resep baru:", selectedGroup.name);
    if (!newName || newName === selectedGroup.name) return;
    updateRecipeGroup(selectedGroup.id, {
      name: newName,
      base_yield_grams: selectedGroup.base_yield_grams,
    }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["recipe-groups"] }),
    );
  }

  function handleDeleteGroup() {
    if (!selectedGroup) return;
    if (
      window.confirm(
        `Hapus resep "${selectedGroup.name}"? Hanya bisa dihapus kalau tidak ada produk yang memakainya.`,
      )
    ) {
      deleteGroupMutation.mutate(selectedGroup.id);
    }
  }

  return (
    <div style={{ padding: 24, display: "flex", gap: 16 }}>
      {/* Sidebar list resep */}
      <div style={{ width: 260, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 500 }}>Resep</div>
          <button
            className="primary"
            style={{ fontSize: 12, padding: "6px 10px" }}
            onClick={() => setShowGroupForm((v) => !v)}
          >
            <Plus size={13} style={{ verticalAlign: -2, marginRight: 3 }} />
            Baru
          </button>
        </div>

        {showGroupForm && (
          <form
            onSubmit={handleCreateGroup}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <input
              name="name"
              placeholder="Nama resep (ex: ...Level 2)"
              required
            />
            <input
              name="base_yield_grams"
              type="number"
              placeholder="Basis gram (ex: 200)"
              required
            />
            <button type="submit" className="primary">
              Simpan
            </button>
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
          {groups?.map((g: RecipeGroup) => (
            <div
              key={g.id}
              onClick={() => {
                setSelectedGroupId(g.id);
                setActiveTab("bahan");
                setLines([]);
                setNote("");
              }}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--color-border)",
                cursor: "pointer",
                background:
                  selectedGroupId === g.id
                    ? "var(--color-accent-bg)"
                    : "transparent",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: selectedGroupId === g.id ? 500 : 400,
                  color:
                    selectedGroupId === g.id
                      ? "var(--color-accent)"
                      : "var(--color-text-primary)",
                }}
              >
                {g.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color:
                    selectedGroupId === g.id
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  marginTop: 2,
                }}
              >
                basis {formatQty(g.base_yield_grams)}g
              </div>
            </div>
          ))}
          {!groups?.length && (
            <div
              style={{
                padding: 20,
                textAlign: "center",
                fontSize: 13,
                color: "var(--color-text-muted)",
              }}
            >
              Belum ada resep.
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedGroup ? (
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14 }}
        >
          <div
            style={{
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
                    {selectedGroup.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    Basis {formatQty(selectedGroup.base_yield_grams)} gram
                    adonan mentah
                  </div>
                </div>
                <div style={{ display: "flex", gap: 2 }}>
                  <button
                    className="icon-btn"
                    title="Ganti nama"
                    onClick={handleRenameGroup}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="icon-btn danger"
                    title="Hapus resep"
                    onClick={handleDeleteGroup}
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
                    ["bahan", "Bahan & COGS"],
                    ["simulasi", "Simulasi Harga"],
                    ["skala", "Skala Produksi"],
                    [
                      "riwayat",
                      `Riwayat Versi${versions?.length ? ` (${versions.length})` : ""}`,
                    ],
                  ] as [Tab, string][]
                ).map(([tab, label]) => (
                  <div
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      fontSize: 13,
                      fontWeight: activeTab === tab ? 500 : 400,
                      padding: "10px 14px",
                      borderBottom:
                        activeTab === tab
                          ? "2px solid var(--color-accent)"
                          : "2px solid transparent",
                      color:
                        activeTab === tab
                          ? "var(--color-text-primary)"
                          : "var(--color-text-secondary)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: 20 }}>
              {activeTab === "bahan" && (
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 14,
                      padding: "10px 12px",
                      background: "var(--color-accent-bg)",
                      borderRadius: 8,
                    }}
                  >
                    <Copy
                      size={14}
                      style={{ color: "var(--color-accent)", flexShrink: 0 }}
                    />
                    <span
                      style={{ fontSize: 12.5, color: "var(--color-accent)" }}
                    >
                      Salin resep dari:
                    </span>
                    <select
                      value={copyFromGroupId ?? ""}
                      onChange={(e) => {
                        if (e.target.value === "self") {
                          handleCopyFromSelf();
                        } else if (e.target.value) {
                          handleCopyFrom(Number(e.target.value));
                        }
                      }}
                      style={{ flex: 1, fontSize: 12.5 }}
                    >
                      <option value="">Pilih resep sumber...</option>
                      {activeVersionDetail && (
                        <option value="self">
                          ↺ Versi aktif resep ini (tambah/ubah bahan)
                        </option>
                      )}
                      {groups
                        ?.filter((g) => g.id !== selectedGroupId)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {lines.map((line, i) => {
                    const selectedIngredient = ingredients?.find(
                      (ing) => ing.id === line.ingredient_id,
                    );
                    const unitOptions = selectedIngredient
                      ? Array.from(
                          new Set([
                            selectedIngredient.unit,
                            ...selectedIngredient.conversions.map((c) => c.unit),
                            line.unit,
                          ]),
                        )
                      : [line.unit];
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          gap: 8,
                          marginBottom: 8,
                          alignItems: "center",
                        }}
                      >
                        <select
                          value={line.ingredient_id}
                          onChange={(e) =>
                            handleIngredientChange(i, Number(e.target.value))
                          }
                          style={{ flex: 2 }}
                        >
                          {ingredients?.map((ing: Ingredient) => (
                            <option key={ing.id} value={ing.id}>
                              {ing.name} (Rp {formatRupiah(ing.effective_price)}
                              /{ing.unit})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Qty"
                          value={line.qty}
                          onChange={(e) =>
                            updateLine(i, "qty", Number(e.target.value))
                          }
                          style={{ flex: 1 }}
                        />
                        <select
                          value={line.unit}
                          onChange={(e) =>
                            updateLine(i, "unit", e.target.value)
                          }
                          style={{ width: 90 }}
                        >
                          {unitOptions.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => removeLine(i)}>
                          ✕
                        </button>
                      </div>
                    );
                  })}

                  <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                    <button type="button" onClick={addLine}>
                      + Tambah bahan
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowIngredientForm((v) => !v)}
                    >
                      + Bahan belum ada di daftar
                    </button>
                  </div>

                  {showIngredientForm && (
                    <form
                      onSubmit={handleAddIngredient}
                      style={{ display: "flex", gap: 8, marginBottom: 14 }}
                    >
                      <input
                        name="name"
                        placeholder="Nama bahan"
                        required
                        style={{ flex: 2 }}
                      />
                      <input
                        name="unit"
                        placeholder="Satuan (gram/sdt/dll)"
                        required
                        style={{ flex: 1 }}
                      />
                      <button type="submit" className="primary">
                        Simpan
                      </button>
                    </form>
                  )}

                  <input
                    placeholder="Catatan versi (opsional)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ width: "100%", marginBottom: 16 }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 16,
                      borderTop: "1px solid var(--color-border)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        COGS per {formatQty(selectedGroup.base_yield_grams)}g
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 500 }}>
                        Rp {formatRupiah(cogsPerBase)}
                      </div>
                    </div>
                    <button
                      className="primary"
                      disabled={lines.length === 0 || versionMutation.isPending}
                      onClick={() => versionMutation.mutate()}
                      style={{ padding: "9px 18px" }}
                    >
                      {versionMutation.isPending
                        ? "Menyimpan..."
                        : "Simpan versi baru"}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "simulasi" && (
                <div>
                  {cogsPerBase > 0 ? (
                    <>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginBottom: 16,
                        }}
                      >
                        Simulasi harga jual per basis resep (
                        {formatQty(selectedGroup.base_yield_grams)}g),
                        berdasarkan COGS versi aktif.
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 16,
                          maxWidth: 480,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 12.5,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Margin
                        </label>
                        <input
                          type="range"
                          min={40}
                          max={90}
                          value={margin}
                          onChange={(e) => setMargin(Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>
                          {margin}%
                        </span>
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 500 }}>
                        Rp {formatRupiah(priceSimulation?.selling_price ?? 0)}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--color-text-muted)",
                          marginTop: 6,
                        }}
                      >
                        Standar food cost snack: margin ~70-80% (food cost
                        20-30%)
                      </div>
                    </>
                  ) : (
                    <div
                      style={{ fontSize: 13, color: "var(--color-text-muted)" }}
                    >
                      Simpan versi resep dulu di tab "Bahan & COGS" supaya ada
                      COGS untuk disimulasikan.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "skala" && (
                <div>
                  {activeVersion ? (
                    <>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          marginBottom: 16,
                        }}
                      >
                        Hitung kebutuhan bahan untuk target berat adonan
                        berapapun, tidak terikat produk jual manapun.
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Mau buat
                        </span>
                        <input
                          type="number"
                          value={scaleGrams}
                          onChange={(e) =>
                            setScaleGrams(Number(e.target.value))
                          }
                          style={{ width: 110 }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          gram adonan
                        </span>
                      </div>
                      {scaleResult && (
                        <div style={{ maxWidth: 420 }}>
                          {scaleResult.ingredients.map((ing) => (
                            <div
                              key={ing.ingredient_id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13,
                                padding: "6px 0",
                                borderBottom: "1px solid var(--color-border)",
                              }}
                            >
                              <span>{ing.ingredient_name}</span>
                              <span>
                                {ing.qty.toFixed(2)} {ing.unit}
                              </span>
                            </div>
                          ))}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginTop: 10,
                              paddingTop: 10,
                            }}
                          >
                            <span style={{ fontSize: 14, fontWeight: 500 }}>
                              Total biaya
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 500 }}>
                              Rp {formatRupiah(scaleResult.total_cost)}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{ fontSize: 13, color: "var(--color-text-muted)" }}
                    >
                      Simpan versi resep dulu di tab "Bahan & COGS" supaya
                      kalkulator ini bisa dipakai.
                    </div>
                  )}
                </div>
              )}

              {activeTab === "riwayat" && (
                <div>
                  {versions?.map((v) => (
                    <div
                      key={v.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--color-border)",
                        fontSize: 13,
                      }}
                    >
                      <span>
                        Versi {v.version_number} {v.note ? `- ${v.note}` : ""}
                      </span>
                      <span
                        style={{
                          color: "var(--color-text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        Rp {formatRupiah(v.total_cogs_snapshot)}
                      </span>
                    </div>
                  ))}
                  {!versions?.length && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--color-text-muted)",
                        textAlign: "center",
                        padding: 20,
                      }}
                    >
                      Belum ada versi resep.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Produk yang pakai resep ini - selalu kelihatan di bawah, di semua tab */}
          <div
            style={{
              background: "var(--color-surface-2)",
              border: "1px solid var(--color-border)",
              borderRadius: 12,
              padding: "16px 20px",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>
              Produk jual yang pakai resep ini
            </div>
            {linkedProducts.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                Belum ada produk yang terhubung. Set "Resep" di form produk
                (halaman Kategori & Produk).
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                {linkedProducts.map((p) => (
                  <ProductCogsCard key={p.id} product={p} />
                ))}
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
          Pilih resep di kiri, atau buat resep baru.
        </div>
      )}
    </div>
  );
}

function ProductCogsCard({ product }: { product: Product }) {
  const { data } = useQuery({
    queryKey: ["product-cogs", product.id],
    queryFn: () => getProductCogsFull(product.id),
  });

  return (
    <div
      style={{
        background: "var(--color-surface-1)",
        borderRadius: 8,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
        {product.size_label ?? "-"} · {product.weight_grams ?? "?"}g
      </div>
      <div style={{ fontSize: 14, fontWeight: 500 }}>
        {data?.cogs_with_overhead != null
          ? `COGS Rp ${formatRupiah(data.cogs_with_overhead)}`
          : data?.ingredient_cogs != null
            ? `Rp ${formatRupiah(data.ingredient_cogs)} (blm overhead)`
            : "-"}
      </div>
    </div>
  );
}
