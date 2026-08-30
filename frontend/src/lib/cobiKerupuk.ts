import { apiGet, apiPost, apiPatch, apiDelete } from "./api";

export interface Category {
  id: number;
  name: string;
  description: string | null;
}

export interface IngredientConversion {
  id: number;
  unit: string;
  to_base_qty: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  current_price: number;
  yield_percent: number;
  effective_price: number;
  updated_at: string;
  conversions: IngredientConversion[];
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  variant_label: string | null;
  size_label: string | null;
  weight_grams: number | null;
  recipe_group_id: number | null;
  selling_price: number;
  stock_qty: number;
  min_stock_qty: number;
  stock_unit: string;
}

export interface RecipeGroup {
  id: number;
  name: string;
  base_yield_grams: number;
  active_version_id: number | null;
}

export interface RecipeVersion {
  id: number;
  version_number: number;
  note: string | null;
  total_cogs_snapshot: number;
}

export interface RecipeVersionIngredientDetail {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  qty: number;
  unit_price_snapshot: number;
  subtotal: number;
}

export interface RecipeVersionDetail extends RecipeVersion {
  ingredients: RecipeVersionIngredientDetail[];
}

export interface ScaledIngredient {
  ingredient_id: number;
  ingredient_name: string;
  unit: string;
  qty: number;
  subtotal: number;
}

export interface ScaleResult {
  target_grams: number;
  ingredients: ScaledIngredient[];
  total_cost: number;
}



// ---- Kategori ----
export const getCategories = () => apiGet<Category[]>("/cobi-kerupuk/categories");

export const createCategory = (data: { name: string; description?: string }) =>
  apiPost<Category>("/cobi-kerupuk/categories", data);

export const updateCategory = (id: number, data: { name: string; description?: string }) =>
  apiPatch<Category>(`/cobi-kerupuk/categories/${id}`, data);



// ---- Bahan baku ----
export const getIngredients = () => apiGet<Ingredient[]>("/cobi-kerupuk/ingredients");

export const createIngredient = (data: { name: string; unit: string; current_price: number; yield_percent?: number }) =>
  apiPost<Ingredient>("/cobi-kerupuk/ingredients", data);

export const updateIngredient = (
  id: number,
  data: { name: string; unit: string; current_price: number; yield_percent: number }
) => apiPatch<Ingredient>(`/cobi-kerupuk/ingredients/${id}`, data);

export const addIngredientConversion = (ingredientId: number, data: { unit: string; to_base_qty: number }) =>
  apiPost<IngredientConversion>(`/cobi-kerupuk/ingredients/${ingredientId}/conversions`, data);

export const deleteIngredientConversion = (ingredientId: number, conversionId: number) =>
  apiDelete(`/cobi-kerupuk/ingredients/${ingredientId}/conversions/${conversionId}`);

export const deleteIngredient = (id: number) =>
  apiDelete<{ permanently_deleted: boolean }>(`/cobi-kerupuk/ingredients/${id}`);



// ---- Produk ----
export const getProducts = (categoryId?: number) =>
  apiGet<Product[]>(`/cobi-kerupuk/products${categoryId ? `?category_id=${categoryId}` : ""}`);

export interface ProductInput {
  category_id: number;
  name: string;
  variant_label?: string;
  size_label?: string;
  weight_grams?: number;
  recipe_group_id?: number;
  selling_price: number;
  stock_unit?: string;
}

export const createProduct = (data: ProductInput) => apiPost<Product>("/cobi-kerupuk/products", data);

export const updateProduct = (id: number, data: ProductInput) =>
  apiPatch<Product>(`/cobi-kerupuk/products/${id}`, data);

export const deleteProduct = (id: number) => apiDelete(`/cobi-kerupuk/products/${id}`);


export interface ProductSizeInput {
  size_label: string;
  selling_price: number;
  weight_grams?: number;
  stock_unit: string;
}

export const createProductsBulk = (data: {
  category_id: number;
  name: string;
  variants: string[];
  sizes: ProductSizeInput[];
}) => apiPost<Product[]>("/cobi-kerupuk/products/bulk", data);




// ---- Resep per level (RecipeGroup) ----
export const getRecipeGroups = () => apiGet<RecipeGroup[]>("/cobi-kerupuk/recipe-groups");

export const createRecipeGroup = (data: { name: string; base_yield_grams: number }) =>
  apiPost<RecipeGroup>("/cobi-kerupuk/recipe-groups", data);

export const updateRecipeGroup = (id: number, data: { name: string; base_yield_grams: number }) =>
  apiPatch<RecipeGroup>(`/cobi-kerupuk/recipe-groups/${id}`, data);

export const deleteRecipeGroup = (id: number) => apiDelete(`/cobi-kerupuk/recipe-groups/${id}`);

export const getRecipeVersions = (groupId: number) =>
  apiGet<RecipeVersion[]>(`/cobi-kerupuk/recipe-groups/${groupId}/versions`);

export const getRecipeVersionDetail = (groupId: number, versionId: number) =>
  apiGet<RecipeVersionDetail>(`/cobi-kerupuk/recipe-groups/${groupId}/versions/${versionId}`);

export const createRecipeVersion = (
  groupId: number,
  data: { note?: string; ingredients: { ingredient_id: number; qty: number; unit?: string }[] }
) => apiPost<RecipeVersion>(`/cobi-kerupuk/recipe-groups/${groupId}/versions`, data);

export const scaleRecipe = (groupId: number, targetGrams: number) =>
  apiGet<ScaleResult>(`/cobi-kerupuk/recipe-groups/${groupId}/scale?target_grams=${targetGrams}`);

export const simulatePrice = (cogs: number, marginPercent: number) =>
  apiPost<{ selling_price: number }>("/cobi-kerupuk/simulate-price", {
    cogs,
    margin_percent: marginPercent,
  });


export interface PriceHistoryEntry {
  id: number;
  price: number;
  purchase_qty: number | null;
  purchase_unit: string | null;
  total_price: number | null;
  brand: string | null;
  recorded_at: string;
}

export const getPurchaseUnits = (ingredientId: number) =>
  apiGet<{ options: string[] }>(`/cobi-kerupuk/ingredients/${ingredientId}/purchase-units`);

export const recordPurchase = (
  ingredientId: number,
  data: {
    purchase_qty: number;
    purchase_unit: string;
    total_price: number;
    purchase_date?: string;
    brand?: string;
  }
) => apiPost<Ingredient>(`/cobi-kerupuk/ingredients/${ingredientId}/purchases`, data);

export const updatePurchase = (
  ingredientId: number,
  historyId: number,
  data: {
    purchase_qty: number;
    purchase_unit: string;
    total_price: number;
    purchase_date?: string;
    brand?: string;
  }
) => apiPatch<PriceHistoryEntry>(`/cobi-kerupuk/ingredients/${ingredientId}/purchases/${historyId}`, data);

export const deletePurchase = (ingredientId: number, historyId: number) =>
  apiDelete(`/cobi-kerupuk/ingredients/${ingredientId}/purchases/${historyId}`);

export const getPriceHistory = (ingredientId: number) =>
  apiGet<PriceHistoryEntry[]>(`/cobi-kerupuk/ingredients/${ingredientId}/price-history`);

export interface OverheadItemInput {
  name: string;
  amount: number;
}

export interface Overhead {
  id: number;
  month: string;
  estimated_production_grams: number;
  items: OverheadItemInput[];
  total_cost: number;
  overhead_per_gram: number;
}

export interface OverheadSummary {
  id: number;
  month: string;
  total_cost: number;
  overhead_per_gram: number;
}

export const listOverheads = () => apiGet<OverheadSummary[]>("/cobi-kerupuk/overhead");

export const getOverheadByMonth = (month: string) =>
  apiGet<Overhead | null>(`/cobi-kerupuk/overhead/${month}`);

export const saveOverhead = (data: {
  month: string;
  estimated_production_grams: number;
  items: OverheadItemInput[];
}) => apiPost<Overhead>("/cobi-kerupuk/overhead", data);

export const deleteOverhead = (month: string) => apiDelete(`/cobi-kerupuk/overhead/${month}`);

export interface ProductCogsResult {
  product_id: number;
  ingredient_cogs: number | null;
  overhead_per_gram: number;
  cogs_with_overhead: number | null;
}

export const getProductCogsFull = (productId: number) =>
  apiGet<ProductCogsResult>(`/cobi-kerupuk/products/${productId}/cogs`);