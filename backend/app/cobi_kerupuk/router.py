from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date

from app.cobi_kerupuk import service
from app.cobi_kerupuk.models import (
    Ingredient,
    IngredientPriceHistory,
    IngredientUnitConversion,
    Packaging,
    Product,
    ProductCategory,
    RecipeGroup,
)
from app.cobi_kerupuk.schemas import (
    CategoryCreate,
    CategoryOut,
    IngredientCreate,
    IngredientOut,
    OverheadOut,
    OverheadUpsert,
    OverheadSummaryOut,
    PackagingCreate,
    PackagingOut,
    PackagingUpdate,
    PriceHistoryOut,
    PriceSimulationRequest,
    PriceSimulationResponse,
    ProductBulkCreate,
    ProductCogsOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    PurchaseCreate,
    PurchaseUpdate,
    RecipeGroupCreate,
    RecipeGroupOut,
    RecipeVersionCreate,
    RecipeVersionDetailOut,
    RecipeVersionOut,
    ScaleResponse,
    StockAdjustmentInput,
    IngredientUnitConversionInput,
    IngredientUnitConversionOut,
    UnitReferenceOut,
)
from app.core.dependencies import get_current_user
from app.core.models import User
from app.database import get_db

router = APIRouter()


# ---- Kategori ----


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(ProductCategory).where(ProductCategory.is_active)).all()


@router.post("/categories", response_model=CategoryOut)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    category = ProductCategory(**payload.model_dump())
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.patch("/categories/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int,
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    category.name = payload.name
    category.description = payload.description
    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}", status_code=204)
def delete_category(
    category_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    category = db.get(ProductCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Kategori tidak ditemukan")
    has_products = db.scalar(
        select(Product).where(Product.category_id == category_id, Product.is_active)
    )
    if has_products:
        raise HTTPException(status_code=400, detail="Kategori masih punya produk aktif")
    category.is_active = False
    db.commit()


# ---- Bahan baku ----


@router.get("/ingredients", response_model=list[IngredientOut])
def list_ingredients(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    ingredients = db.scalars(
        select(Ingredient).where(Ingredient.is_active == True).order_by(Ingredient.name)  # noqa: E712
    ).all()
    result = []
    for ing in ingredients:
        conversions = db.scalars(
            select(IngredientUnitConversion).where(
                IngredientUnitConversion.ingredient_id == ing.id
            )
        ).all()
        result.append(
            IngredientOut(
                id=ing.id,
                name=ing.name,
                unit=ing.unit,
                current_price=ing.current_price,
                yield_percent=ing.yield_percent,
                effective_price=service.get_effective_price(ing),
                stock_qty=ing.stock_qty,
                min_stock_qty=ing.min_stock_qty,
                lead_time_days=ing.lead_time_days,
                updated_at=ing.updated_at,
                conversions=conversions,
            )
        )
    return result


@router.post("/ingredients", response_model=IngredientOut)
def create_ingredient(
    payload: IngredientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = Ingredient(**payload.model_dump())
    db.add(ingredient)
    db.commit()
    db.refresh(ingredient)
    return IngredientOut(
        id=ingredient.id,
        name=ingredient.name,
        unit=ingredient.unit,
        current_price=ingredient.current_price,
        yield_percent=ingredient.yield_percent,
        effective_price=service.get_effective_price(ingredient),
        stock_qty=ingredient.stock_qty,
        min_stock_qty=ingredient.min_stock_qty,
        lead_time_days=ingredient.lead_time_days,
        updated_at=ingredient.updated_at,
        conversions=[],
    )


@router.patch("/ingredients/{ingredient_id}", response_model=IngredientOut)
def update_ingredient(
    ingredient_id: int,
    payload: IngredientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
        ingredient.name = payload.name
    ingredient.unit = payload.unit
    ingredient.current_price = payload.current_price
    ingredient.yield_percent = payload.yield_percent
    ingredient.min_stock_qty = payload.min_stock_qty
    ingredient.lead_time_days = payload.lead_time_days
    db.commit()
    db.refresh(ingredient)
    conversions = db.scalars(
        select(IngredientUnitConversion).where(
            IngredientUnitConversion.ingredient_id == ingredient.id
        )
    ).all()
    return IngredientOut(
        id=ingredient.id,
        name=ingredient.name,
        unit=ingredient.unit,
        current_price=ingredient.current_price,
        yield_percent=ingredient.yield_percent,
        effective_price=service.get_effective_price(ingredient),
        stock_qty=ingredient.stock_qty,
        min_stock_qty=ingredient.min_stock_qty,
        lead_time_days=ingredient.lead_time_days,
        updated_at=ingredient.updated_at,
        conversions=conversions,
    )


@router.post(
    "/ingredients/{ingredient_id}/conversions",
    response_model=IngredientUnitConversionOut,
)
def add_conversion(
    ingredient_id: int,
    payload: IngredientUnitConversionInput,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    return service.add_ingredient_conversion(
        db, ingredient_id, payload.unit, payload.to_base_qty
    )


@router.delete(
    "/ingredients/{ingredient_id}/conversions/{conversion_id}", status_code=204
)
def delete_conversion(
    ingredient_id: int,
    conversion_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    conversion = db.get(IngredientUnitConversion, conversion_id)
    if conversion is None or conversion.ingredient_id != ingredient_id:
        raise HTTPException(status_code=404, detail="Konversi tidak ditemukan")
    service.delete_ingredient_conversion(db, conversion)


@router.delete("/ingredients/{ingredient_id}")
def delete_ingredient(
    ingredient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    permanently_deleted = service.delete_ingredient_safely(db, ingredient)
    return {"permanently_deleted": permanently_deleted}


@router.post("/ingredients/{ingredient_id}/purchases", response_model=IngredientOut)
def record_purchase(
    ingredient_id: int,
    payload: PurchaseCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    try:
        service.record_purchase(
            db,
            ingredient,
            payload.purchase_qty,
            payload.purchase_unit,
            payload.total_price,
            payload.purchase_date,
            payload.brand,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.refresh(ingredient)

    conversions = db.scalars(
        select(IngredientUnitConversion).where(
            IngredientUnitConversion.ingredient_id == ingredient.id
        )
    ).all()
    return IngredientOut(
        id=ingredient.id,
        name=ingredient.name,
        unit=ingredient.unit,
        current_price=ingredient.current_price,
        yield_percent=ingredient.yield_percent,
        effective_price=service.get_effective_price(ingredient),
        stock_qty=ingredient.stock_qty,
        min_stock_qty=ingredient.min_stock_qty,
        lead_time_days=ingredient.lead_time_days,
        updated_at=ingredient.updated_at,
        conversions=conversions,
    )


@router.post(
    "/ingredients/{ingredient_id}/stock-adjustment", response_model=IngredientOut
)
def adjust_stock(
    ingredient_id: int,
    payload: StockAdjustmentInput,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    service.adjust_stock(db, ingredient, payload.new_qty, payload.reason)
    db.refresh(ingredient)
    conversions = db.scalars(
        select(IngredientUnitConversion).where(
            IngredientUnitConversion.ingredient_id == ingredient.id
        )
    ).all()
    return IngredientOut(
        id=ingredient.id,
        name=ingredient.name,
        unit=ingredient.unit,
        current_price=ingredient.current_price,
        yield_percent=ingredient.yield_percent,
        effective_price=service.get_effective_price(ingredient),
        stock_qty=ingredient.stock_qty,
        min_stock_qty=ingredient.min_stock_qty,
        lead_time_days=ingredient.lead_time_days,
        updated_at=ingredient.updated_at,
        conversions=conversions,
    )


@router.get(
    "/ingredients/{ingredient_id}/price-history", response_model=list[PriceHistoryOut]
)
def get_price_history(
    ingredient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.scalars(
        select(IngredientPriceHistory)
        .where(IngredientPriceHistory.ingredient_id == ingredient_id)
        .order_by(IngredientPriceHistory.recorded_at.desc())
    ).all()


@router.patch(
    "/ingredients/{ingredient_id}/purchases/{history_id}",
    response_model=PriceHistoryOut,
)
def update_purchase(
    ingredient_id: int,
    history_id: int,
    payload: PurchaseUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    history = db.get(IngredientPriceHistory, history_id)
    if history is None or history.ingredient_id != ingredient_id:
        raise HTTPException(status_code=404, detail="Riwayat pembelian tidak ditemukan")
    try:
        service.update_purchase_history(
            db,
            history,
            payload.purchase_qty,
            payload.purchase_unit,
            payload.total_price,
            payload.purchase_date,
            payload.brand,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    db.refresh(history)
    return history


@router.delete("/ingredients/{ingredient_id}/purchases/{history_id}", status_code=204)
def delete_purchase(
    ingredient_id: int,
    history_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    history = db.get(IngredientPriceHistory, history_id)
    if history is None or history.ingredient_id != ingredient_id:
        raise HTTPException(status_code=404, detail="Riwayat pembelian tidak ditemukan")
    service.delete_purchase_history(db, history)


@router.get("/ingredients/{ingredient_id}/purchase-units")
def get_purchase_units(
    ingredient_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    ingredient = db.get(Ingredient, ingredient_id)
    if ingredient is None:
        raise HTTPException(status_code=404, detail="Bahan tidak ditemukan")
    return {"options": service.get_purchase_unit_options(ingredient.unit)}


@router.get("/unit-reference", response_model=UnitReferenceOut)
def get_unit_reference(_: User = Depends(get_current_user)):
    return {
        "reference": service.UNIT_REFERENCE,
        "groups": service.UNIT_GROUPS,
    }


# ---- Produk ----


@router.get("/products", response_model=list[ProductOut])
def list_products(
    category_id: int | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = select(Product).where(Product.is_active)
    if category_id:
        query = query.where(Product.category_id == category_id)
    products = db.scalars(query).all()
    return [service.product_to_out(p) for p in products]


@router.get("/products/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    return service.product_to_out(product)


@router.get("/products/{product_id}/cogs", response_model=ProductCogsOut)
def get_product_cogs(
    product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    result = service.get_product_cogs(db, product)
    return ProductCogsOut(product_id=product_id, **result)


@router.post("/products", response_model=ProductOut)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    data = payload.model_dump(exclude={"packagings"})
    product = Product(**data)
    db.add(product)
    db.flush()
    service.sync_product_packagings(db, product, payload.packagings)
    db.commit()
    db.refresh(product)
    return service.product_to_out(product)


@router.patch("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    for field, value in payload.model_dump(exclude={"packagings"}).items():
        setattr(product, field, value)
    service.sync_product_packagings(db, product, payload.packagings)
    db.commit()
    db.refresh(product)
    return service.product_to_out(product)


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Produk tidak ditemukan")
    product.is_active = False
    db.commit()


@router.post("/products/bulk", response_model=list[ProductOut])
def create_products_bulk(
    payload: ProductBulkCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    variant_labels = payload.variants or [None]
    created: list[Product] = []

    for variant_label in variant_labels:
        for size in payload.sizes:
            product = Product(
                category_id=payload.category_id,
                name=payload.name,
                variant_label=variant_label,
                size_label=size.size_label,
                weight_grams=size.weight_grams,
                recipe_group_id=payload.recipe_group_id,
                selling_price=size.selling_price,
                stock_unit=size.stock_unit,
                min_stock_qty=size.min_stock_qty,
            )
            db.add(product)
            db.flush()
            service.sync_product_packagings(db, product, size.packagings)
            created.append(product)

    db.commit()
    for product in created:
        db.refresh(product)

    return [service.product_to_out(p) for p in created]


# ---- Kemasan & label ----


@router.get("/packagings", response_model=list[PackagingOut])
def list_packagings(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(
        select(Packaging).where(Packaging.is_active).order_by(Packaging.name)
    ).all()


@router.post("/packagings", response_model=PackagingOut)
def create_packaging(
    payload: PackagingCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    packaging = Packaging(**payload.model_dump())
    db.add(packaging)
    db.commit()
    db.refresh(packaging)
    return packaging


@router.patch("/packagings/{packaging_id}", response_model=PackagingOut)
def update_packaging(
    packaging_id: int,
    payload: PackagingUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    packaging = db.get(Packaging, packaging_id)
    if packaging is None:
        raise HTTPException(status_code=404, detail="Kemasan tidak ditemukan")
    for field, value in payload.model_dump().items():
        setattr(packaging, field, value)
    db.commit()
    db.refresh(packaging)
    return packaging


@router.delete("/packagings/{packaging_id}", status_code=204)
def delete_packaging(
    packaging_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    packaging = db.get(Packaging, packaging_id)
    if packaging is None:
        raise HTTPException(status_code=404, detail="Kemasan tidak ditemukan")
    packaging.is_active = False
    db.commit()


# ---- Resep per level (RecipeGroup) ----


@router.get("/recipe-groups", response_model=list[RecipeGroupOut])
def list_recipe_groups(
    db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    return db.scalars(
        select(RecipeGroup).where(RecipeGroup.is_active).order_by(RecipeGroup.name)  # noqa: E712
    ).all()


@router.post("/recipe-groups", response_model=RecipeGroupOut)
def create_recipe_group(
    payload: RecipeGroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    existing = db.scalar(select(RecipeGroup).where(RecipeGroup.name == payload.name))
    if existing:
        raise HTTPException(status_code=400, detail="Nama resep sudah ada")

    group = RecipeGroup(**payload.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.patch("/recipe-groups/{group_id}", response_model=RecipeGroupOut)
def update_recipe_group(
    group_id: int,
    payload: RecipeGroupCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    group = db.get(RecipeGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Resep tidak ditemukan")
    group.name = payload.name
    group.base_yield_grams = payload.base_yield_grams
    db.commit()
    db.refresh(group)
    return group


@router.delete("/recipe-groups/{group_id}", status_code=204)
def delete_recipe_group(
    group_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    group = db.get(RecipeGroup, group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="Resep tidak ditemukan")

    linked_products = db.scalar(
        select(Product).where(Product.recipe_group_id == group_id, Product.is_active)  # noqa: E712
    )
    if linked_products:
        raise HTTPException(
            status_code=400,
            detail="Resep ini masih dipakai produk aktif, tidak bisa dihapus",
        )

    group.is_active = False
    db.commit()


@router.get("/recipe-groups/{group_id}/versions", response_model=list[RecipeVersionOut])
def list_recipe_versions(
    group_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    from app.cobi_kerupuk.models import RecipeVersion

    return db.scalars(
        select(RecipeVersion)
        .where(RecipeVersion.recipe_group_id == group_id)
        .order_by(RecipeVersion.version_number.desc())
    ).all()


@router.get(
    "/recipe-groups/{group_id}/versions/{version_id}",
    response_model=RecipeVersionDetailOut,
)
def get_recipe_version_detail(
    group_id: int,
    version_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    detail = service.get_recipe_version_detail(db, version_id)
    if detail is None:
        raise HTTPException(status_code=404, detail="Versi resep tidak ditemukan")
    return detail


@router.post("/recipe-groups/{group_id}/versions", response_model=RecipeVersionOut)
def create_recipe_version(
    group_id: int,
    payload: RecipeVersionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    try:
        return service.create_recipe_version(db, group_id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@router.get("/recipe-groups/{group_id}/scale", response_model=ScaleResponse)
def scale_recipe(
    group_id: int,
    target_grams: float,
    production_date: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from decimal import Decimal

    result = service.scale_recipe(
        db, group_id, Decimal(str(target_grams)), production_date
    )
    if result is None:
        raise HTTPException(status_code=400, detail="Resep ini belum punya versi aktif")
    return result


@router.post("/simulate-price", response_model=PriceSimulationResponse)
def simulate_price(
    payload: PriceSimulationRequest, _: User = Depends(get_current_user)
):
    try:
        price = service.simulate_selling_price(payload.cogs, payload.margin_percent)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return PriceSimulationResponse(selling_price=price)


@router.get("/overhead", response_model=list[OverheadSummaryOut])
def list_overhead(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    overheads = service.list_overheads(db)
    return [
        OverheadSummaryOut(
            id=o.id,
            month=o.month,
            total_cost=sum((i.amount for i in o.items), Decimal("0")),
            overhead_per_gram=(
                sum((i.amount for i in o.items), Decimal("0"))
                / o.estimated_production_grams
                if o.estimated_production_grams
                else Decimal("0")
            ),
        )
        for o in overheads
    ]


@router.get("/overhead/{month}", response_model=OverheadOut | None)
def get_overhead_by_month(
    month: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    overhead = service.get_overhead_by_month(db, month)
    if overhead is None:
        return None
    return service.overhead_to_out(overhead)


@router.delete("/overhead/{month}", status_code=204)
def delete_overhead(
    month: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)
):
    overhead = service.get_overhead_by_month(db, month)
    if overhead is None:
        raise HTTPException(
            status_code=404, detail="Overhead bulan ini tidak ditemukan"
        )
    service.delete_overhead(db, overhead)


@router.post("/overhead", response_model=OverheadOut)
def save_overhead(
    payload: OverheadUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    overhead = service.upsert_overhead(db, payload)
    return service.overhead_to_out(overhead)
