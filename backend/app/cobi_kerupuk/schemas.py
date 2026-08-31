from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class CategoryCreate(BaseModel):
    name: str
    description: str | None = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: str | None = None
    is_active: bool

    class Config:
        from_attributes = True


class IngredientUnitConversionInput(BaseModel):
    unit: str
    to_base_qty: Decimal


class IngredientUnitConversionOut(BaseModel):
    id: int
    unit: str
    to_base_qty: Decimal

    class Config:
        from_attributes = True


class IngredientCreate(BaseModel):
    name: str
    unit: str
    current_price: Decimal = Decimal("0")
    yield_percent: Decimal = Decimal("100")
    min_stock_qty: Decimal = Decimal("0")
    lead_time_days: int = 0


class IngredientOut(BaseModel):
    id: int
    name: str
    unit: str
    current_price: Decimal
    yield_percent: Decimal
    effective_price: Decimal
    stock_qty: Decimal
    min_stock_qty: Decimal
    lead_time_days: int
    updated_at: datetime
    conversions: list[IngredientUnitConversionOut] = []

    class Config:
        from_attributes = True


class StockAdjustmentInput(BaseModel):
    new_qty: Decimal
    reason: str | None = None

class PurchaseCreate(BaseModel):
    purchase_qty: Decimal
    purchase_unit: str
    total_price: Decimal
    purchase_date: date | None = None
    brand: str | None = None


class PurchaseUpdate(BaseModel):
    purchase_qty: Decimal
    purchase_unit: str
    total_price: Decimal
    purchase_date: date | None = None
    brand: str | None = None


class PriceHistoryOut(BaseModel):
    id: int
    price: Decimal
    purchase_qty: Decimal | None
    purchase_unit: str | None
    total_price: Decimal | None
    brand: str | None
    recorded_at: datetime

    class Config:
        from_attributes = True


class ProductPackagingInput(BaseModel):
    packaging_id: int
    qty: Decimal = Decimal("1")


class ProductPackagingOut(BaseModel):
    id: int
    packaging_id: int
    packaging_name: str
    packaging_type: str
    unit_price: Decimal
    qty: Decimal
    subtotal: Decimal


class ProductCreate(BaseModel):
    category_id: int
    name: str
    variant_label: str | None = None
    size_label: str | None = None
    weight_grams: Decimal | None = None
    recipe_group_id: int | None = None
    selling_price: Decimal
    min_stock_qty: Decimal = Decimal("0")
    stock_unit: str = "pack"
    packagings: list[ProductPackagingInput] = []


class ProductUpdate(ProductCreate):
    pass


class ProductOut(BaseModel):
    id: int
    category_id: int
    name: str
    variant_label: str | None
    size_label: str | None
    weight_grams: Decimal | None
    recipe_group_id: int | None
    selling_price: Decimal
    stock_qty: Decimal
    min_stock_qty: Decimal
    stock_unit: str
    packagings: list[ProductPackagingOut] = []

    class Config:
        from_attributes = True


class ProductSizeInput(BaseModel):
    size_label: str
    selling_price: Decimal
    weight_grams: Decimal | None = None
    stock_unit: str = "pack"
    min_stock_qty: Decimal = Decimal("0")
    packagings: list[ProductPackagingInput] = []


class ProductBulkCreate(BaseModel):
    category_id: int
    name: str
    recipe_group_id: int | None = None
    variants: list[str] = []
    sizes: list[ProductSizeInput]


class PackagingCreate(BaseModel):
    name: str
    type: str = "plastik"
    current_price: Decimal


class PackagingUpdate(PackagingCreate):
    pass


class PackagingOut(BaseModel):
    id: int
    name: str
    type: str
    current_price: Decimal
    is_active: bool

    class Config:
        from_attributes = True


# ---- Resep (per level, basis gram) ----


class RecipeGroupCreate(BaseModel):
    name: str
    base_yield_grams: Decimal


class RecipeGroupOut(BaseModel):
    id: int
    name: str
    base_yield_grams: Decimal
    active_version_id: int | None

    class Config:
        from_attributes = True


class RecipeIngredientInput(BaseModel):
    ingredient_id: int
    qty: Decimal
    unit: str | None = None  # kosong = pakai satuan dasar bahan


class RecipeVersionCreate(BaseModel):
    note: str | None = None
    ingredients: list[RecipeIngredientInput]


class RecipeVersionOut(BaseModel):
    id: int
    version_number: int
    note: str | None
    total_cogs_snapshot: Decimal

    class Config:
        from_attributes = True


class RecipeVersionIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str
    qty: Decimal
    unit_price_snapshot: Decimal
    subtotal: Decimal


class RecipeVersionDetailOut(RecipeVersionOut):
    ingredients: list[RecipeVersionIngredientOut]


class ScaledIngredientOut(BaseModel):
    ingredient_id: int
    ingredient_name: str
    unit: str
    qty: Decimal
    subtotal: Decimal
    stock_qty: Decimal
    is_sufficient: bool
    shortage_qty: Decimal
    purchase_deadline: date | None = None


class ScaleResponse(BaseModel):
    target_grams: Decimal
    production_date: date | None = None
    ingredients: list[ScaledIngredientOut]
    total_cost: Decimal


class ProductCogsOut(BaseModel):
    product_id: int
    ingredient_cogs: Decimal | None
    overhead_per_gram: Decimal
    packaging_cost: Decimal
    cogs_with_overhead: Decimal | None


class PriceSimulationRequest(BaseModel):
    cogs: Decimal
    margin_percent: Decimal


class PriceSimulationResponse(BaseModel):
    selling_price: Decimal


class OverheadItemInput(BaseModel):
    name: str
    amount: Decimal


class OverheadUpsert(BaseModel):
    month: str  # "2026-08"
    estimated_production_grams: Decimal
    items: list[OverheadItemInput]


class OverheadItemOut(BaseModel):
    name: str
    amount: Decimal

    class Config:
        from_attributes = True


class OverheadOut(BaseModel):
    id: int
    month: str
    estimated_production_grams: Decimal
    items: list[OverheadItemOut]
    total_cost: Decimal
    overhead_per_gram: Decimal


class OverheadSummaryOut(BaseModel):
    id: int
    month: str
    total_cost: Decimal
    overhead_per_gram: Decimal


class UnitReferenceOut(BaseModel):
    reference: dict[str, Decimal]
    groups: dict[str, list[str]]
