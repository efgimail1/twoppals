import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Copy, Trash2, X } from "lucide-react";
import {
  Category,
  Packaging,
  Product,
  ProductPackagingInput,
  ProductSizeInput,
  createCategory,
  createProduct,
  createProductsBulk,
  getCategories,
  getPackagings,
  getProducts,
  updateProduct,
  deleteProduct,
} from "../../lib/cobiKerupuk";
import { getRecipeGroups, RecipeGroup } from "../../lib/cobiKerupuk";
import {
  formatRupiah,
  formatRupiahInput,
  parseRupiah,
  STOCK_UNITS,
} from "../../lib/format";

interface PackagingLine {
  packaging_id: string;
  qty: string;
}

type Mode = "single" | "bulk";

interface BulkSizeRow {
  size_label: string;
  priceDisplay: string;
  weightGrams: string;
  stock_unit: string;
  packagings: PackagingLine[];
}

export default function Produk() {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("single");
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  // ---- state form single ----
  const [singleCategoryId, setSingleCategoryId] = useState("");
  const [singleName, setSingleName] = useState("");
  const [singleVariant, setSingleVariant] = useState("");
  const [singleSize, setSingleSize] = useState("");
  const [singlePriceDisplay, setSinglePriceDisplay] = useState("");
  const [singleStockUnit, setSingleStockUnit] = useState("pack");
  const [singleWeightGrams, setSingleWeightGrams] = useState("");
  const [singleRecipeGroupId, setSingleRecipeGroupId] = useState("");
  const [singlePackagings, setSinglePackagings] = useState<PackagingLine[]>([]);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // ---- state form bulk ----
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [bulkName, setBulkName] = useState("");
  const [bulkRecipeGroupId, setBulkRecipeGroupId] = useState("");
  const [bulkVariantsText, setBulkVariantsText] = useState("");
  const [bulkSizes, setBulkSizes] = useState<BulkSizeRow[]>([
    {
      size_label: "",
      priceDisplay: "",
      weightGrams: "",
      stock_unit: "pack",
      packagings: [],
    },
  ]);

  const { data: packagings } = useQuery({
    queryKey: ["packagings"],
    queryFn: getPackagings,
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: recipeGroups } = useQuery({
    queryKey: ["recipe-groups"],
    queryFn: getRecipeGroups,
  });
  const { data: products } = useQuery({
    queryKey: ["products", selectedCategory],
    queryFn: () => getProducts(selectedCategory ?? undefined),
  });

  const categoryMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowCategoryForm(false);
    },
  });

  const singleMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetSingleForm();
      setDrawerOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: {
      id: number;
      data: Parameters<typeof updateProduct>[1];
    }) => updateProduct(vars.id, vars.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetSingleForm();
      setEditingProductId(null);
      setDrawerOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: createProductsBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      resetBulkForm();
      setDrawerOpen(false);
    },
  });

  function resetSingleForm() {
    setSingleCategoryId("");
    setSingleName("");
    setSingleVariant("");
    setSingleSize("");
    setSingleWeightGrams("");
    setSingleRecipeGroupId("");
    setSinglePriceDisplay("");
    setSingleStockUnit("pack");
    setSinglePackagings([]);
  }

  function addSinglePackagingLine() {
    if (!packagings || packagings.length === 0) return;
    setSinglePackagings((prev) => [
      ...prev,
      { packaging_id: String(packagings[0].id), qty: "1" },
    ]);
  }

  function updateSinglePackagingLine(
    index: number,
    field: keyof PackagingLine,
    value: string,
  ) {
    setSinglePackagings((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    );
  }

  function removeSinglePackagingLine(index: number) {
    setSinglePackagings((prev) => prev.filter((_, i) => i !== index));
  }

  function addBulkPackagingLine(sizeIndex: number) {
    if (!packagings || packagings.length === 0) return;
    setBulkSizes((prev) =>
      prev.map((s, i) =>
        i === sizeIndex
          ? {
              ...s,
              packagings: [
                ...s.packagings,
                { packaging_id: String(packagings[0].id), qty: "1" },
              ],
            }
          : s,
      ),
    );
  }

  function updateBulkPackagingLine(
    sizeIndex: number,
    lineIndex: number,
    field: keyof PackagingLine,
    value: string,
  ) {
    setBulkSizes((prev) =>
      prev.map((s, i) =>
        i === sizeIndex
          ? {
              ...s,
              packagings: s.packagings.map((line, j) =>
                j === lineIndex ? { ...line, [field]: value } : line,
              ),
            }
          : s,
      ),
    );
  }

  function removeBulkPackagingLine(sizeIndex: number, lineIndex: number) {
    setBulkSizes((prev) =>
      prev.map((s, i) =>
        i === sizeIndex
          ? { ...s, packagings: s.packagings.filter((_, j) => j !== lineIndex) }
          : s,
      ),
    );
  }

  function openEditDrawer(p: Product) {
    setMode("single");
    setEditingProductId(p.id);
    setSingleCategoryId(String(p.category_id));
    setSingleName(p.name);
    setSingleVariant(p.variant_label ?? "");
    setSingleSize(p.size_label ?? "");
    setSingleWeightGrams(p.weight_grams != null ? String(p.weight_grams) : "");
    setSingleRecipeGroupId(
      p.recipe_group_id != null ? String(p.recipe_group_id) : "",
    );
    setSinglePriceDisplay(formatRupiah(p.selling_price));
    setSingleStockUnit(p.stock_unit);
    setSinglePackagings(
      p.packagings.map((pp) => ({
        packaging_id: String(pp.packaging_id),
        qty: String(pp.qty),
      })),
    );
    setDrawerOpen(true);
  }

  function openDuplicateDrawer(p: Product) {
    setMode("single");
    setEditingProductId(null); // null -> berarti submit = create baru, bukan update
    setSingleCategoryId(String(p.category_id));
    setSingleName(p.name + " (copy)");
    setSingleVariant(p.variant_label ?? "");
    setSingleSize(p.size_label ?? "");
    setSinglePriceDisplay(formatRupiah(p.selling_price));
    setSingleStockUnit(p.stock_unit);
    setSinglePackagings(
      p.packagings.map((pp) => ({
        packaging_id: String(pp.packaging_id),
        qty: String(pp.qty),
      })),
    );
    setDrawerOpen(true);
  }

  function handleDelete(p: Product) {
    if (window.confirm(`Hapus produk "${p.name}"?`)) {
      deleteMutation.mutate(p.id);
    }
  }

  function resetBulkForm() {
    setBulkCategoryId("");
    setBulkName("");
    setBulkRecipeGroupId("");
    setBulkVariantsText("");
    setBulkSizes([
      {
        size_label: "",
        priceDisplay: "",
        weightGrams: "",
        stock_unit: "pack",
        packagings: [],
      },
    ]);
  }

  function handleAddCategory(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    categoryMutation.mutate({ name: form.get("name") as string });
  }

  function handleSubmitSingle(e: React.FormEvent) {
    e.preventDefault();
    const data = {
      category_id: Number(singleCategoryId),
      name: singleName,
      variant_label: singleVariant || undefined,
      size_label: singleSize || undefined,
      weight_grams: singleWeightGrams ? Number(singleWeightGrams) : undefined,
      recipe_group_id: singleRecipeGroupId
        ? Number(singleRecipeGroupId)
        : undefined,
      selling_price: parseRupiah(singlePriceDisplay),
      stock_unit: singleStockUnit,
      packagings: singlePackagings
        .filter((pl) => pl.packaging_id)
        .map(
          (pl): ProductPackagingInput => ({
            packaging_id: Number(pl.packaging_id),
            qty: Number(pl.qty) || 1,
          }),
        ),
    };

    if (editingProductId) {
      updateMutation.mutate({ id: editingProductId, data });
    } else {
      singleMutation.mutate(data);
    }
  }

  function handleSubmitBulk(e: React.FormEvent) {
    e.preventDefault();
    const variants = bulkVariantsText
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean);

    const sizes: ProductSizeInput[] = bulkSizes
      .filter((s) => s.size_label.trim())
      .map((s) => ({
        size_label: s.size_label,
        selling_price: parseRupiah(s.priceDisplay),
        weight_grams: s.weightGrams ? Number(s.weightGrams) : undefined,
        stock_unit: s.stock_unit,
        packagings: s.packagings
          .filter((pl) => pl.packaging_id)
          .map(
            (pl): ProductPackagingInput => ({
              packaging_id: Number(pl.packaging_id),
              qty: Number(pl.qty) || 1,
            }),
          ),
      }));

    bulkMutation.mutate({
      category_id: Number(bulkCategoryId),
      name: bulkName,
      recipe_group_id: bulkRecipeGroupId
        ? Number(bulkRecipeGroupId)
        : undefined,
      variants,
      sizes,
    });
  }

  const bulkVariantCount =
    bulkVariantsText
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean).length || 1;
  const bulkSizeCount = bulkSizes.filter((s) => s.size_label.trim()).length;
  const bulkTotalCount = bulkVariantCount * bulkSizeCount;

  const filteredProducts = (products ?? []).filter((p) => {
    const keyword = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(keyword) ||
      (p.variant_label ?? "").toLowerCase().includes(keyword) ||
      (p.size_label ?? "").toLowerCase().includes(keyword)
    );
  });

  const groupedByVariant = filteredProducts.reduce<Record<string, Product[]>>(
    (groups, p) => {
      const key = p.variant_label ?? "Tanpa varian";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
      return groups;
    },
    {},
  );

  function stockStatus(p: Product): { color: string; label: string } {
    if (p.stock_qty <= 0)
      return { color: "var(--color-danger)", label: "Habis" };
    if (p.stock_qty <= p.min_stock_qty)
      return { color: "var(--color-warning)", label: "Menipis" };
    return { color: "var(--color-success)", label: "" };
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
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>Kategori & Produk</h2>
        <button
          className="primary"
          onClick={() => {
            setMode("single");
            setEditingProductId(null);
            resetSingleForm();
            setDrawerOpen(true);
          }}
        >
          + Produk
        </button>
      </div>

      {/* Filter kategori */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 20,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          onClick={() => setSelectedCategory(null)}
          className="badge"
          style={{
            cursor: "pointer",
            border: "1px solid var(--color-border)",
            background:
              selectedCategory === null
                ? "var(--color-accent-bg)"
                : "transparent",
            color:
              selectedCategory === null
                ? "var(--color-accent)"
                : "var(--color-text-secondary)",
          }}
        >
          Semua
        </span>
        {categories?.map((c: Category) => (
          <span
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className="badge"
            style={{
              cursor: "pointer",
              border: "1px solid var(--color-border)",
              background:
                selectedCategory === c.id
                  ? "var(--color-accent-bg)"
                  : "transparent",
              color:
                selectedCategory === c.id
                  ? "var(--color-accent)"
                  : "var(--color-text-secondary)",
            }}
          >
            {c.name}
          </span>
        ))}
        <span
          onClick={() => setShowCategoryForm((v) => !v)}
          style={{
            fontSize: 12.5,
            color: "var(--color-text-muted)",
            cursor: "pointer",
            marginLeft: 4,
          }}
        >
          + kategori baru
        </span>

        <input
          type="text"
          placeholder="Cari produk..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: "auto", width: 200, fontSize: 13 }}
        />
      </div>

      {showCategoryForm && (
        <form
          onSubmit={handleAddCategory}
          style={{ display: "flex", gap: 8, marginBottom: 20, maxWidth: 360 }}
        >
          <input
            name="name"
            placeholder="Nama kategori (ex: Makanan Jadi)"
            required
            style={{ flex: 1 }}
          />
          <button type="submit" className="primary">
            Simpan
          </button>
        </form>
      )}

      {/* List produk, dikelompokkan per varian */}
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
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px",
            gap: 10,
            padding: "10px 16px",
            fontSize: 12,
            color: "var(--color-text-muted)",
            background: "var(--color-surface-1)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          <div>Produk</div>
          <div>Varian</div>
          <div>Ukuran</div>
          <div>Harga jual</div>
          <div>Stok</div>
          <div></div>
        </div>

        {Object.entries(groupedByVariant).map(([variantKey, items]) => (
          <div key={variantKey}>
            <div
              style={{
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                background: "var(--color-surface-1)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              {variantKey} ({items.length} produk)
            </div>

            {items.map((p) => {
              const status = stockStatus(p);
              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 100px",
                    gap: 10,
                    padding: "10px 16px",
                    alignItems: "center",
                    borderTop: "1px solid var(--color-border)",
                    fontSize: 13,
                  }}
                >
                  <div>{p.name}</div>
                  <div style={{ color: "var(--color-text-secondary)" }}>
                    {p.variant_label ?? "-"}
                  </div>
                  <div style={{ color: "var(--color-text-secondary)" }}>
                    {p.size_label ?? "-"}
                  </div>
                  <div style={{ fontWeight: 500 }}>
                    Rp {formatRupiah(p.selling_price)}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      color: "var(--color-text-secondary)",
                      fontSize: 12.5,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: status.color,
                        flexShrink: 0,
                      }}
                    />
                    {p.stock_qty} {p.stock_unit}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      className="icon-btn"
                      title="Edit"
                      onClick={() => openEditDrawer(p)}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Duplikat"
                      onClick={() => openDuplicateDrawer(p)}
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="icon-btn danger"
                      title="Hapus"
                      onClick={() => handleDelete(p)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div
            style={{
              padding: 24,
              textAlign: "center",
              fontSize: 13,
              color: "var(--color-text-muted)",
            }}
          >
            Tidak ada produk yang cocok.
          </div>
        )}
      </div>

      {/* Drawer tambah produk */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.25)",
              zIndex: 10,
            }}
          />
          <div
            style={{
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: 400,
              background: "var(--color-surface-0)",
              boxShadow: "-4px 0 16px rgba(0,0,0,0.08)",
              zIndex: 11,
              padding: 24,
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 500 }}>
                {editingProductId ? "Edit Produk" : "Tambah Produk"}
              </div>
              <span
                onClick={() => setDrawerOpen(false)}
                style={{ cursor: "pointer", color: "var(--color-text-muted)" }}
              >
                ✕
              </span>
            </div>

            {/* Toggle mode */}
            <div
              style={{
                display: "flex",
                gap: 4,
                marginBottom: 20,
                background: "var(--color-surface-1)",
                borderRadius: 8,
                padding: 3,
              }}
            >
              <span
                onClick={() => setMode("single")}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 12.5,
                  padding: "7px 0",
                  borderRadius: 6,
                  cursor: "pointer",
                  background:
                    mode === "single" ? "var(--color-accent)" : "transparent",
                  color:
                    mode === "single"
                      ? "var(--color-on-accent)"
                      : "var(--color-text-secondary)",
                }}
              >
                Satu produk
              </span>
              <span
                onClick={() => setMode("bulk")}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: 12.5,
                  padding: "7px 0",
                  borderRadius: 6,
                  cursor: "pointer",
                  background:
                    mode === "bulk" ? "var(--color-accent)" : "transparent",
                  color:
                    mode === "bulk"
                      ? "var(--color-on-accent)"
                      : "var(--color-text-secondary)",
                }}
              >
                Banyak sekaligus
              </span>
            </div>

            {mode === "single" ? (
              <form
                onSubmit={handleSubmitSingle}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
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
                    Kategori
                  </label>
                  <select
                    value={singleCategoryId}
                    onChange={(e) => setSingleCategoryId(e.target.value)}
                    required
                    style={{ width: "100%" }}
                  >
                    <option value="">Pilih kategori</option>
                    {categories?.map((c: Category) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
                    Nama produk
                  </label>
                  <input
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    placeholder="ex: Kerupuk Daun Jeruk"
                    required
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Varian
                    </label>
                    <input
                      value={singleVariant}
                      onChange={(e) => setSingleVariant(e.target.value)}
                      placeholder="ex: Level 3"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Ukuran
                    </label>
                    <input
                      value={singleSize}
                      onChange={(e) => setSingleSize(e.target.value)}
                      placeholder="ex: Sedang"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Berat (gram)
                    </label>
                    <input
                      type="number"
                      value={singleWeightGrams}
                      onChange={(e) => setSingleWeightGrams(e.target.value)}
                      placeholder="ex: 250"
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      Resep
                    </label>
                    <select
                      value={singleRecipeGroupId}
                      onChange={(e) => setSingleRecipeGroupId(e.target.value)}
                      style={{ width: "100%" }}
                    >
                      <option value="">Tanpa resep</option>
                      {recipeGroups?.map((g: RecipeGroup) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
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
                    Kemasan & label
                  </label>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    {singlePackagings.map((line, i) => (
                      <div key={i} style={{ display: "flex", gap: 6 }}>
                        <select
                          value={line.packaging_id}
                          onChange={(e) =>
                            updateSinglePackagingLine(
                              i,
                              "packaging_id",
                              e.target.value,
                            )
                          }
                          style={{ flex: 2, minWidth: 0 }}
                        >
                          {packagings?.map((pk: Packaging) => (
                            <option key={pk.id} value={pk.id}>
                              {pk.name} (Rp {formatRupiah(pk.current_price)})
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(e) =>
                            updateSinglePackagingLine(i, "qty", e.target.value)
                          }
                          style={{ width: 60 }}
                        />
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Hapus"
                          onClick={() => removeSinglePackagingLine(i)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addSinglePackagingLine}
                      disabled={!packagings?.length}
                    >
                      + Tambah kemasan/label
                    </button>
                    {!packagings?.length && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: "var(--color-text-muted)",
                        }}
                      >
                        Belum ada kemasan di katalog. Tambah dulu di menu
                        Kemasan & Label.
                      </div>
                    )}
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
                    Harga jual
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
                      value={singlePriceDisplay}
                      onChange={(e) =>
                        setSinglePriceDisplay(formatRupiahInput(e.target.value))
                      }
                      placeholder="0"
                      inputMode="numeric"
                      required
                      style={{ flex: 1, borderRadius: "0 6px 6px 0" }}
                    />
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
                    Satuan stok
                  </label>
                  <select
                    value={singleStockUnit}
                    onChange={(e) => setSingleStockUnit(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    {STOCK_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="primary"
                  disabled={
                    singleMutation.isPending || updateMutation.isPending
                  }
                  style={{ marginTop: 8 }}
                >
                  {singleMutation.isPending || updateMutation.isPending
                    ? "Menyimpan..."
                    : editingProductId
                      ? "Simpan perubahan"
                      : "Simpan produk"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={handleSubmitBulk}
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
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
                    Kategori
                  </label>
                  <select
                    value={bulkCategoryId}
                    onChange={(e) => setBulkCategoryId(e.target.value)}
                    required
                    style={{ width: "100%" }}
                  >
                    <option value="">Pilih kategori</option>
                    {categories?.map((c: Category) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
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
                    Nama produk (base)
                  </label>
                  <input
                    value={bulkName}
                    onChange={(e) => setBulkName(e.target.value)}
                    placeholder="ex: Kerupuk Daun Jeruk"
                    required
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
                    Resep (opsional - dipakai semua varian & ukuran di bawah,
                    ikut skala berat masing-masing)
                  </label>
                  <select
                    value={bulkRecipeGroupId}
                    onChange={(e) => setBulkRecipeGroupId(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    <option value="">Tanpa resep</option>
                    {recipeGroups?.map((g: RecipeGroup) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
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
                    Daftar varian (1 baris = 1 varian, kosongkan kalau tidak ada
                    varian)
                  </label>
                  <textarea
                    value={bulkVariantsText}
                    onChange={(e) => setBulkVariantsText(e.target.value)}
                    placeholder={
                      "Level 0\nLevel 1\nLevel 2\nLevel 3\nLevel 4\nLevel 5"
                    }
                    rows={4}
                    style={{
                      width: "100%",
                      fontFamily: "inherit",
                      fontSize: 13,
                      padding: 8,
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                    }}
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
                    Daftar ukuran + harga (berlaku sama untuk semua varian di
                    atas)
                  </label>
                  {bulkSizes.map((size, i) => (
                    <div
                      key={i}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                        <input
                          placeholder="Ukuran (ex: Kecil)"
                          value={size.size_label}
                          onChange={(e) =>
                            setBulkSizes((prev) =>
                              prev.map((s, idx) =>
                                idx === i
                                  ? { ...s, size_label: e.target.value }
                                  : s,
                              ),
                            )
                          }
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <button
                          type="button"
                          className="icon-btn danger"
                          title="Hapus ukuran ini"
                          onClick={() =>
                            setBulkSizes((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
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
                            placeholder="0"
                            value={size.priceDisplay}
                            onChange={(e) =>
                              setBulkSizes((prev) =>
                                prev.map((s, idx) =>
                                  idx === i
                                    ? {
                                        ...s,
                                        priceDisplay: formatRupiahInput(
                                          e.target.value,
                                        ),
                                      }
                                    : s,
                                ),
                              )
                            }
                            inputMode="numeric"
                            style={{
                              flex: 1,
                              minWidth: 0,
                              borderRadius: "0 6px 6px 0",
                            }}
                          />
                        </div>
                        <select
                          value={size.stock_unit}
                          onChange={(e) =>
                            setBulkSizes((prev) =>
                              prev.map((s, idx) =>
                                idx === i
                                  ? { ...s, stock_unit: e.target.value }
                                  : s,
                              ),
                            )
                          }
                          style={{ width: 100, flexShrink: 0 }}
                        >
                          {STOCK_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                        <input
                          type="number"
                          placeholder="Berat (gram, opsional - untuk skala COGS)"
                          value={size.weightGrams}
                          onChange={(e) =>
                            setBulkSizes((prev) =>
                              prev.map((s, idx) =>
                                idx === i
                                  ? { ...s, weightGrams: e.target.value }
                                  : s,
                              ),
                            )
                          }
                          style={{ width: "100%" }}
                        />
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--color-text-secondary)",
                            marginBottom: 4,
                          }}
                        >
                          Kemasan & label ukuran ini
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          {size.packagings.map((line, j) => (
                            <div key={j} style={{ display: "flex", gap: 6 }}>
                              <select
                                value={line.packaging_id}
                                onChange={(e) =>
                                  updateBulkPackagingLine(
                                    i,
                                    j,
                                    "packaging_id",
                                    e.target.value,
                                  )
                                }
                                style={{ flex: 2, minWidth: 0 }}
                              >
                                {packagings?.map((pk: Packaging) => (
                                  <option key={pk.id} value={pk.id}>
                                    {pk.name} (Rp{" "}
                                    {formatRupiah(pk.current_price)})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                value={line.qty}
                                onChange={(e) =>
                                  updateBulkPackagingLine(
                                    i,
                                    j,
                                    "qty",
                                    e.target.value,
                                  )
                                }
                                style={{ width: 60 }}
                              />
                              <button
                                type="button"
                                className="icon-btn danger"
                                title="Hapus"
                                onClick={() => removeBulkPackagingLine(i, j)}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addBulkPackagingLine(i)}
                            disabled={!packagings?.length}
                          >
                            + Tambah kemasan/label
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setBulkSizes((prev) => [
                        ...prev,
                        {
                          size_label: "",
                          priceDisplay: "",
                          weightGrams: "",
                          stock_unit: "pack",
                          packagings: [],
                        },
                      ])
                    }
                  >
                    + Tambah ukuran
                  </button>
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: "var(--color-text-secondary)",
                    background: "var(--color-surface-1)",
                    padding: 10,
                    borderRadius: 8,
                  }}
                >
                  Akan membuat <strong>{bulkTotalCount || 0} produk</strong> (
                  {bulkVariantCount} varian × {bulkSizeCount} ukuran)
                </div>

                <button
                  type="submit"
                  className="primary"
                  disabled={bulkMutation.isPending || bulkTotalCount === 0}
                  style={{ marginTop: 4 }}
                >
                  {bulkMutation.isPending
                    ? "Menyimpan..."
                    : `Buat ${bulkTotalCount || ""} produk`}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
