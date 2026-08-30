from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.inventory import service
from app.inventory.models import Procurement, ProcurementItem
from app.inventory.schemas import (
    ProcurementCreate,
    ProcurementSummaryOut,
    VendorItemPriceOut,
)

router = APIRouter()


@router.get("/items/{item_id}/vendor-comparison", response_model=list[VendorItemPriceOut])
def get_vendor_comparison(item_id: int, db: Session = Depends(get_db)):
    return service.compare_vendor_prices(db, item_id)


@router.post("/procurements", response_model=ProcurementSummaryOut)
def create_procurement(payload: ProcurementCreate, db: Session = Depends(get_db)):
    if payload.price_mode not in ("client_price_known", "margin_only"):
        raise HTTPException(status_code=400, detail="price_mode tidak valid")

    procurement = Procurement(
        client_id=payload.client_id,
        title=payload.title,
        price_mode=payload.price_mode,
        bonus_amount=payload.bonus_amount,
    )

    for item_in in payload.items:
        # Validasi konsisten dengan price_mode project
        if payload.price_mode == "client_price_known" and item_in.client_price is None:
            raise HTTPException(
                status_code=400,
                detail="client_price wajib diisi untuk mode client_price_known",
            )
        if payload.price_mode == "margin_only" and item_in.margin_override is None:
            raise HTTPException(
                status_code=400,
                detail="margin_override wajib diisi untuk mode margin_only",
            )

        procurement.items.append(
            ProcurementItem(
                item_id=item_in.item_id,
                vendor_id=item_in.vendor_id,
                spec=item_in.spec,
                qty=item_in.qty,
                vendor_price=item_in.vendor_price,
                client_price=item_in.client_price,
                margin_override=item_in.margin_override,
            )
        )

    db.add(procurement)
    db.commit()
    db.refresh(procurement)

    summary = service.calculate_procurement_summary(procurement)
    return ProcurementSummaryOut(
        id=procurement.id,
        title=procurement.title,
        status=procurement.status,
        price_mode=procurement.price_mode,
        bonus_amount=procurement.bonus_amount,
        items=procurement.items,
        **summary,
    )


@router.get("/procurements/{procurement_id}", response_model=ProcurementSummaryOut)
def get_procurement(procurement_id: int, db: Session = Depends(get_db)):
    procurement = db.get(Procurement, procurement_id)
    if procurement is None:
        raise HTTPException(status_code=404, detail="Project pengadaan tidak ditemukan")

    summary = service.calculate_procurement_summary(procurement)
    return ProcurementSummaryOut(
        id=procurement.id,
        title=procurement.title,
        status=procurement.status,
        price_mode=procurement.price_mode,
        bonus_amount=procurement.bonus_amount,
        items=procurement.items,
        **summary,
    )
