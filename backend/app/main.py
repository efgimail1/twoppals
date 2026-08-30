import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.cobi_kerupuk.router import router as cobi_kerupuk_router
from app.core.router import router as core_router
from app.inventory.router import router as inventory_router
from app.cobi_kerupuk.pemesanan.router import router as pemesanan_router

logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","module":"%(name)s","message":"%(message)s"}',
)

app = FastAPI(title="Twoppals API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: batasi ke domain frontend saat production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(core_router, prefix=f"{settings.api_v1_prefix}/core", tags=["core"])
app.include_router(
    cobi_kerupuk_router,
    prefix=f"{settings.api_v1_prefix}/cobi-kerupuk",
    tags=["cobi-kerupuk"],
)
app.include_router(
    inventory_router, prefix=f"{settings.api_v1_prefix}/inventory", tags=["inventory"]
)
app.include_router(
    pemesanan_router,
    prefix=f"{settings.api_v1_prefix}/cobi-kerupuk",
    tags=["cobi-kerupuk-pemesanan"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}
