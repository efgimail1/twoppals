from decimal import Decimal
from datetime import datetime, date
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.cobi_kerupuk.models import (
    Ingredient,
    IngredientPriceHistory,
    IngredientUnitConversion,
    MonthlyOverhead,
    OverheadItem,
    Product,
    RecipeGroup,
    RecipeVersion,
    RecipeVersionIngredient,
)
from app.cobi_kerupuk.schemas import RecipeVersionCreate


# Nilai tiap satuan relatif terhadap satuan terkecil di grupnya.
# Menambah satuan baru cukup tambah baris di sini + daftarkan di UNIT_GROUPS.
UNIT_REFERENCE: dict[str, Decimal] = {
    # berat - acuan: gram
    "gram": Decimal("1"),
    "ons": Decimal("100"),
    "kg": Decimal("1000"),
    # volume - acuan: ml
    "ml": Decimal("1"),
    "liter": Decimal("1000"),
    # hitungan - acuan: pcs
    "pcs": Decimal("1"),
    "lusin": Decimal("12"),
    "kodi": Decimal("20"),
    "gross": Decimal("144"),
    # takaran dapur - acuan: sdt
    "sdt": Decimal("1"),
    "sdm": Decimal("3"),
}

UNIT_GROUPS: dict[str, list[str]] = {
    "gram": ["gram", "ons", "kg"],
    "ons": ["gram", "ons", "kg"],
    "kg": ["gram", "ons", "kg"],
    "ml": ["ml", "liter"],
    "liter": ["ml", "liter"],
    "pcs": ["pcs", "lusin", "kodi", "gross"],
    "lusin": ["pcs", "lusin", "kodi", "gross"],
    "kodi": ["pcs", "lusin", "kodi", "gross"],
    "gross": ["pcs", "lusin", "kodi", "gross"],
    "sdt": ["sdt", "sdm"],
    "sdm": ["sdt", "sdm"],
}


def get_purchase_unit_options(base_unit: str) -> list[str]:
    """
    Satuan lain (butir, siung, lembar, ikat, ruas) belum punya kelipatan standar ->
    cuma bisa beli per satuan itu sendiri.
    """
    return UNIT_GROUPS.get(base_unit, [base_unit])


def convert_to_base_unit(base_unit: str, purchase_unit: str, qty: Decimal) -> Decimal:
    if purchase_unit == base_unit:
        return qty

    group = UNIT_GROUPS.get(base_unit)
    if not group or purchase_unit not in group:
        raise ValueError(
            f"Satuan beli '{purchase_unit}' tidak cocok dgn satuan dasar '{base_unit}'"
        )

    # qty (dalam purchase_unit) -> nilai acuan -> dibagi nilai acuan base_unit
    factor = UNIT_REFERENCE[purchase_unit] / UNIT_REFERENCE[base_unit]
    return qty * factor


def convert_qty_to_base(
    db: Session, ingredient: Ingredient, unit: str | None, qty: Decimal
) -> Decimal:
    """
    Konversi qty ke satuan dasar bahan itu. Urutan pengecekan:
    1. Kalau unit kosong atau sama dengan satuan dasar -> tidak perlu konversi
    2. Cek tabel konversi KHUSUS bahan ini (ex: 1 sdt garam = 6 gram)
    3. Fallback ke tabel konversi generik (gram/kg, ml/liter, dst) - hanya valid untuk
       satuan sejenis fisik yang sama (berat ke berat, volume ke volume)
    """
    if unit is None or unit == ingredient.unit:
        return qty

    custom = db.scalar(
        select(IngredientUnitConversion).where(
            IngredientUnitConversion.ingredient_id == ingredient.id,
            IngredientUnitConversion.unit == unit,
        )
    )
    if custom:
        return qty * custom.to_base_qty

    # fallback ke konversi generik (dipakai fitur "Catat pembelian")
    return convert_to_base_unit(ingredient.unit, unit, qty)


def get_effective_price(ingredient: Ingredient) -> Decimal:
    """
    Harga efektif setelah memperhitungkan yield% (rendemen) -
    INI yang dipakai untuk COGS.
    """
    if ingredient.yield_percent <= 0:
        return ingredient.current_price
    return ingredient.current_price / (ingredient.yield_percent / Decimal("100"))


def add_ingredient_conversion(
    db: Session, ingredient_id: int, unit: str, to_base_qty: Decimal
) -> IngredientUnitConversion:
    conversion = IngredientUnitConversion(
        ingredient_id=ingredient_id, unit=unit, to_base_qty=to_base_qty
    )
    db.add(conversion)
    db.commit()
    db.refresh(conversion)
    return conversion


def delete_ingredient_conversion(
    db: Session, conversion: IngredientUnitConversion
) -> None:
    db.delete(conversion)
    db.commit()


def record_purchase(
    db: Session,
    ingredient: Ingredient,
    purchase_qty: Decimal,
    purchase_unit: str,
    total_price: Decimal,
    purchase_date: date | None = None,
    brand: str | None = None,
) -> None:
    qty_in_base = convert_to_base_unit(ingredient.unit, purchase_unit, purchase_qty)
    if qty_in_base <= 0:
        raise ValueError("Jumlah beli harus lebih dari 0")

    price_per_base = total_price / qty_in_base
    ingredient.current_price = price_per_base
    ingredient.updated_at = datetime.utcnow()

    recorded_at = (
        datetime.combine(purchase_date, datetime.min.time())
        if purchase_date
        else datetime.utcnow()
    )

    db.add(
        IngredientPriceHistory(
            ingredient_id=ingredient.id,
            price=price_per_base,
            purchase_qty=purchase_qty,
            purchase_unit=purchase_unit,
            total_price=total_price,
            brand=brand,
            recorded_at=recorded_at,
        )
    )
    db.commit()


def upsert_overhead(db: Session, payload) -> MonthlyOverhead:
    existing = db.scalar(
        select(MonthlyOverhead).where(
            MonthlyOverhead.month == payload.month,
            MonthlyOverhead.is_active == True,  # noqa: E712
        )
    )
    if existing:
        for item in list(existing.items):
            db.delete(item)
        existing.estimated_production_grams = payload.estimated_production_grams
        existing.items = [
            OverheadItem(name=i.name, amount=i.amount) for i in payload.items
        ]
        db.commit()
        db.refresh(existing)
        return existing

    new_overhead = MonthlyOverhead(
        month=payload.month,
        estimated_production_grams=payload.estimated_production_grams,
        items=[OverheadItem(name=i.name, amount=i.amount) for i in payload.items],
    )
    db.add(new_overhead)
    db.commit()
    db.refresh(new_overhead)
    return new_overhead


def get_current_overhead(db: Session) -> MonthlyOverhead | None:
    return db.scalar(
        select(MonthlyOverhead).order_by(MonthlyOverhead.month.desc()).limit(1)
    )


def list_overheads(db: Session) -> list[MonthlyOverhead]:
    return db.scalars(
        select(MonthlyOverhead)
        .where(MonthlyOverhead.is_active == True)  # noqa: E712
        .order_by(MonthlyOverhead.month.desc())
    ).all()


def get_overhead_by_month(db: Session, month: str) -> MonthlyOverhead | None:
    return db.scalar(
        select(MonthlyOverhead).where(
            MonthlyOverhead.month == month,
            MonthlyOverhead.is_active == True,  # noqa: E712
        )
    )


def delete_overhead(db: Session, overhead: MonthlyOverhead) -> None:
    overhead.is_active = False
    db.commit()


def overhead_to_out(overhead: MonthlyOverhead) -> dict:
    total = sum((i.amount for i in overhead.items), Decimal("0"))
    per_gram = (
        total / overhead.estimated_production_grams
        if overhead.estimated_production_grams
        else Decimal("0")
    )
    return {
        "id": overhead.id,
        "month": overhead.month,
        "estimated_production_grams": overhead.estimated_production_grams,
        "items": overhead.items,
        "total_cost": total,
        "overhead_per_gram": per_gram,
    }


def get_product_cogs(db: Session, product: Product) -> dict:
    ingredient_cogs = None
    if product.recipe_group_id is not None and product.weight_grams is not None:
        group = db.get(RecipeGroup, product.recipe_group_id)
        if group and group.active_version_id:
            version = db.get(RecipeVersion, group.active_version_id)
            ratio = product.weight_grams / group.base_yield_grams
            ingredient_cogs = version.total_cogs_snapshot * ratio

    overhead = get_current_overhead(db)
    overhead_per_gram = Decimal("0")
    if overhead and overhead.estimated_production_grams:
        total = sum((i.amount for i in overhead.items), Decimal("0"))
        overhead_per_gram = total / overhead.estimated_production_grams

    cogs_with_overhead = None
    if ingredient_cogs is not None and product.weight_grams is not None:
        cogs_with_overhead = ingredient_cogs + overhead_per_gram * product.weight_grams

    return {
        "ingredient_cogs": ingredient_cogs,
        "overhead_per_gram": overhead_per_gram,
        "cogs_with_overhead": cogs_with_overhead,
    }


def create_recipe_version(
    db: Session, recipe_group_id: int, payload: RecipeVersionCreate
) -> RecipeVersion:
    last_version_number = (
        db.scalar(
            select(func.max(RecipeVersion.version_number)).where(
                RecipeVersion.recipe_group_id == recipe_group_id
            )
        )
        or 0
    )

    total_cogs = Decimal("0")
    version_ingredients: list[RecipeVersionIngredient] = []

    for line in payload.ingredients:
        ingredient = db.get(Ingredient, line.ingredient_id)
        if ingredient is None:
            raise ValueError(f"Ingredient {line.ingredient_id} tidak ditemukan")

        qty_in_base = convert_qty_to_base(db, ingredient, line.unit, line.qty)
        effective_price = get_effective_price(ingredient)
        subtotal = qty_in_base * effective_price
        total_cogs += subtotal

        version_ingredients.append(
            RecipeVersionIngredient(
                ingredient_id=ingredient.id,
                qty=qty_in_base,  # selalu disimpan dalam satuan dasar
                unit_price_snapshot=effective_price,  # sudah termasuk yield%
                unit_original=(line.unit or ingredient.unit),
                qty_original=line.qty,
            )
        )

    new_version = RecipeVersion(
        recipe_group_id=recipe_group_id,
        version_number=last_version_number + 1,
        note=payload.note,
        total_cogs_snapshot=total_cogs,
        ingredients=version_ingredients,
    )
    db.add(new_version)
    db.flush()

    group = db.get(RecipeGroup, recipe_group_id)
    group.active_version_id = new_version.id

    db.commit()
    db.refresh(new_version)
    return new_version


def get_recipe_version_detail(db: Session, version_id: int) -> dict | None:
    version = db.get(RecipeVersion, version_id)
    if version is None:
        return None

    rows = db.execute(
        select(RecipeVersionIngredient, Ingredient.name, Ingredient.unit)
        .join(Ingredient, Ingredient.id == RecipeVersionIngredient.ingredient_id)
        .where(RecipeVersionIngredient.recipe_version_id == version_id)
    ).all()

    ingredients = []
    for rvi, name, base_unit in rows:
        unit_to_show = rvi.unit_original or base_unit
        qty_to_show = (
            rvi.qty_original
            if getattr(rvi, "qty_original", None) is not None
            else rvi.qty
        )
        ingredients.append(
            {
                "ingredient_id": rvi.ingredient_id,
                "ingredient_name": name,
                "unit": unit_to_show,
                "qty": qty_to_show,
                "unit_price_snapshot": rvi.unit_price_snapshot,
                # subtotal should remain based on qty in base unit * unit_price_snapshot
                "subtotal": rvi.qty * rvi.unit_price_snapshot,
            }
        )

    return {
        "id": version.id,
        "version_number": version.version_number,
        "note": version.note,
        "total_cogs_snapshot": version.total_cogs_snapshot,
        "ingredients": ingredients,
    }


def scale_recipe(
    db: Session, recipe_group_id: int, target_grams: Decimal
) -> dict | None:
    """
    Kalkulator skala produksi -
    tidak terikat produk manapun, murni buat perencanaan.
    """

    group = db.get(RecipeGroup, recipe_group_id)
    if group is None or group.active_version_id is None:
        return None

    detail = get_recipe_version_detail(db, group.active_version_id)
    ratio = target_grams / group.base_yield_grams

    scaled_ingredients = [
        {
            "ingredient_id": ing["ingredient_id"],
            "ingredient_name": ing["ingredient_name"],
            "unit": ing["unit"],
            "qty": ing["qty"] * ratio,
            "subtotal": ing["subtotal"] * ratio,
        }
        for ing in detail["ingredients"]
    ]
    total_cost = detail["total_cogs_snapshot"] * ratio

    return {
        "target_grams": target_grams,
        "ingredients": scaled_ingredients,
        "total_cost": total_cost,
    }


def simulate_selling_price(cogs: Decimal, margin_percent: Decimal) -> Decimal:
    if margin_percent >= 100:
        raise ValueError("Margin tidak boleh 100% atau lebih")
    return (cogs / (Decimal("1") - margin_percent / Decimal("100"))).quantize(
        Decimal("1")
    )


def recompute_current_price(db: Session, ingredient: Ingredient) -> None:
    """
    Dipanggil setelah histori diedit/dihapus -
    harga terkini ikut disesuaikan ke entri histori terbaru.
    """
    latest = db.scalar(
        select(IngredientPriceHistory)
        .where(IngredientPriceHistory.ingredient_id == ingredient.id)
        .order_by(IngredientPriceHistory.recorded_at.desc())
        .limit(1)
    )
    ingredient.current_price = latest.price if latest else Decimal("0")
    db.commit()


def update_purchase_history(
    db: Session,
    history: IngredientPriceHistory,
    purchase_qty: Decimal,
    purchase_unit: str,
    total_price: Decimal,
    purchase_date: date | None,
    brand: str | None = None,
) -> None:
    ingredient = db.get(Ingredient, history.ingredient_id)
    qty_in_base = convert_to_base_unit(ingredient.unit, purchase_unit, purchase_qty)
    if qty_in_base <= 0:
        raise ValueError("Jumlah beli harus lebih dari 0")

    history.purchase_qty = purchase_qty
    history.purchase_unit = purchase_unit
    history.total_price = total_price
    history.price = total_price / qty_in_base
    history.brand = brand
    if purchase_date:
        history.recorded_at = datetime.combine(purchase_date, datetime.min.time())
    db.commit()

    recompute_current_price(db, ingredient)


def delete_purchase_history(db: Session, history: IngredientPriceHistory) -> None:
    ingredient = db.get(Ingredient, history.ingredient_id)
    db.delete(history)
    db.commit()
    recompute_current_price(db, ingredient)


def delete_ingredient_safely(db: Session, ingredient: Ingredient) -> bool:
    """
    Hapus permanen kalau bahan belum pernah dipakai di resep manapun (aman).
    Kalau sudah pernah dipakai, soft delete saja (supaya histori COGS lama tidak rusak).
    Return True kalau dihapus permanen, False kalau cuma di-nonaktifkan.
    """
    used_in_recipe = db.scalar(
        select(RecipeVersionIngredient).where(
            RecipeVersionIngredient.ingredient_id == ingredient.id
        )
    )
    if used_in_recipe:
        ingredient.is_active = False
        db.commit()
        return False

    # aman dihapus permanen - hapus juga histori pembelian & konversi satuannya
    db.query(IngredientPriceHistory).filter(
        IngredientPriceHistory.ingredient_id == ingredient.id
    ).delete()
    db.query(IngredientUnitConversion).filter(
        IngredientUnitConversion.ingredient_id == ingredient.id
    ).delete()
    db.delete(ingredient)
    db.commit()
    return True
