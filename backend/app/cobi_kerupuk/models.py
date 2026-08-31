from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

SCHEMA = "cobi_kerupuk"


class ProductCategory(Base):
    __tablename__ = "product_categories"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Ingredient(Base):
    __tablename__ = "ingredients"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    unit: Mapped[str] = mapped_column(String(20))
    current_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    stock_qty: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=Decimal("0"))
    min_stock_qty: Mapped[Decimal] = mapped_column(Numeric(14, 3), default=Decimal("0"))
    lead_time_days: Mapped[int] = mapped_column(Integer, default=0)
    yield_percent: Mapped[Decimal] = mapped_column(
        Numeric(5, 2), default=Decimal("100")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IngredientUnitConversion(Base):
    """
    Konversi satuan KHUSUS per bahan (bukan global) - karena densitas tiap bahan beda
    (1 sdt garam != 1 sdt tepung). to_base_qty = berapa satuan dasar untuk 1 unit ini.
    Contoh: ingredient=Garam (base unit=gram), unit="sdt",
    to_base_qty=6 -> 1 sdt garam = 6 gram.
    """

    __tablename__ = "ingredient_unit_conversions"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.ingredients.id"))
    unit: Mapped[str] = mapped_column(String(20))
    to_base_qty: Mapped[Decimal] = mapped_column(Numeric(14, 4))


class IngredientPriceHistory(Base):
    __tablename__ = "ingredient_price_history"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.ingredients.id"))
    price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    purchase_qty: Mapped[Decimal | None] = mapped_column(Numeric(14, 3), nullable=True)
    purchase_unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    total_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecipeGroup(Base):
    """
    Resep terikat ke LEVEL, bukan ke produk jual per ukuran.
    base_yield_grams = basis takaran resep ini dihitung (ex: 200 gram adonan mentah).
    Banyak Product (beda ukuran jual) bisa pakai RecipeGroup yang sama,
    COGS masing-masing di-skala dari weight_grams milik produk itu.
    """

    __tablename__ = "recipe_groups"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))  # ex: "Kerupuk Daun Jeruk - Level 2"
    base_yield_grams: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    active_version_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecipeVersion(Base):
    __tablename__ = "recipe_versions"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipe_group_id: Mapped[int] = mapped_column(
        ForeignKey(f"{SCHEMA}.recipe_groups.id")
    )
    version_number: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(String(255), nullable=True)
    total_cogs_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(14, 2)
    )  # COGS per base_yield_grams
    effective_from: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    ingredients: Mapped[list["RecipeVersionIngredient"]] = relationship(
        back_populates="recipe_version"
    )


class RecipeVersionIngredient(Base):
    __tablename__ = "recipe_version_ingredients"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipe_version_id: Mapped[int] = mapped_column(
        ForeignKey(f"{SCHEMA}.recipe_versions.id")
    )
    ingredient_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.ingredients.id"))
    qty: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    unit_price_snapshot: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit_original: Mapped[str | None] = mapped_column(String(20), nullable=True)
    qty_original: Mapped[Decimal | None] = mapped_column(Numeric(14, 3), nullable=True)

    recipe_version: Mapped["RecipeVersion"] = relationship(back_populates="ingredients")


class Packaging(Base):
    """
    Katalog kemasan & label - polanya sama seperti Ingredient (reusable,
    harga bisa berubah dari waktu ke waktu). Tidak butuh konversi satuan
    seperti bahan baku karena selalu dihitung per pcs.
    """

    __tablename__ = "packagings"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    type: Mapped[str] = mapped_column(
        String(20), default="plastik"
    )  # plastik | label | lainnya
    current_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ProductPackaging(Base):
    """
    Baris kemasan/label yang dipakai satu Product, boleh lebih dari satu
    (ex: 1 plastik + 1 stiker). Mirror pola RecipeVersionIngredient.
    """

    __tablename__ = "product_packagings"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.products.id"))
    packaging_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.packagings.id"))
    qty: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=Decimal("1"))

    packaging: Mapped["Packaging"] = relationship()


class Product(Base):
    __tablename__ = "products"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey(f"{SCHEMA}.product_categories.id")
    )
    name: Mapped[str] = mapped_column(String(150))
    variant_label: Mapped[str | None] = mapped_column(String(150), nullable=True)
    size_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    weight_grams: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )  # untuk skala COGS
    recipe_group_id: Mapped[int | None] = mapped_column(
        ForeignKey(f"{SCHEMA}.recipe_groups.id"), nullable=True
    )
    selling_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    stock_qty: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    min_stock_qty: Mapped[Decimal] = mapped_column(Numeric(14, 2), default=0)
    stock_unit: Mapped[str] = mapped_column(String(20), default="pack")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    category: Mapped["ProductCategory"] = relationship()
    recipe_group: Mapped["RecipeGroup | None"] = relationship()
    packagings: Mapped[list["ProductPackaging"]] = relationship(
        cascade="all, delete-orphan"
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.products.id"))
    movement_type: Mapped[str] = mapped_column(String(20))
    qty: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    reason: Mapped[str | None] = mapped_column(String(150), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    payment_method: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["SaleItem"]] = relationship(back_populates="sale")


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.sales.id"))
    product_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.products.id"))
    qty: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    subtotal: Mapped[Decimal] = mapped_column(Numeric(14, 2))

    sale: Mapped["Sale"] = relationship(back_populates="items")


class MonthlyOverhead(Base):
    """
    Biaya tidak langsung per bulan (gas, listrik, sewa, dll)
    - tidak masuk resep per bahan.
    """

    __tablename__ = "monthly_overheads"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    month: Mapped[str] = mapped_column(String(7))  # format "2026-08"
    estimated_production_grams: Mapped[Decimal] = mapped_column(Numeric(14, 2))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    items: Mapped[list["OverheadItem"]] = relationship(
        back_populates="overhead", cascade="all, delete-orphan"
    )


class OverheadItem(Base):
    __tablename__ = "overhead_items"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    monthly_overhead_id: Mapped[int] = mapped_column(
        ForeignKey(f"{SCHEMA}.monthly_overheads.id")
    )
    name: Mapped[str] = mapped_column(String(100))  # ex: "Gas", "Listrik"
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2))

    overhead: Mapped["MonthlyOverhead"] = relationship(back_populates="items")


class IngredientStockAdjustment(Base):
    """
    Histori penyesuaian stok manual (stok opname, susut, dll) -
    terpisah dari histori pembelian.
    """

    __tablename__ = "ingredient_stock_adjustments"
    __table_args__ = {"schema": SCHEMA}

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ingredient_id: Mapped[int] = mapped_column(ForeignKey(f"{SCHEMA}.ingredients.id"))
    qty_before: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    qty_after: Mapped[Decimal] = mapped_column(Numeric(14, 3))
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
