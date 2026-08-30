# twoppals

Aplikasi manajemen multi-bisnis: **Cobi Kerupuk** (produksi & penjualan) dan **Inventory** (pengadaan & vendor), dengan arsitektur modular monolith yang extensible untuk bisnis baru ke depannya.

## Stack

- PostgreSQL (schema terpisah per modul: `core`, `cobi_kerupuk`, `inventory`)
- Backend: Python + FastAPI + SQLAlchemy + Alembic
- Frontend: React + TypeScript + Vite
- Docker + docker-compose

## Menjalankan pertama kali

1. Salin file environment:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan `JWT_SECRET_KEY` dengan string random.

2. Jalankan seluruh stack:
   ```bash
   docker compose up --build
   ```
   - Backend jalan di `http://localhost:1001` (docs otomatis di `/docs`)
   - Frontend jalan di `http://localhost:9001`
   - Postgres jalan di `localhost:5432` (bisa dikoneksikan lewat DBeaver/pgAdmin untuk lihat/query data)

3. Generate migration awal (sekali saja, setelah container `db` & `backend` hidup):
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "init schema"
   docker compose exec backend alembic upgrade head
   ```
   Alembic otomatis: bikin schema `core`, `cobi_kerupuk`, `inventory`, lalu semua tabel di dalamnya sesuai model di `backend/app/*/models.py`.

4. Isi seed data awal (role & daftar bisnis, supaya sidebar frontend muncul):
   ```bash
   docker compose exec backend python -m app.seed
   ```

## Alur kerja migration (Alembic) selanjutnya

Setiap kali mengubah struktur tabel (tambah kolom, tabel baru, dst):

1. Ubah model Python di `backend/app/<modul>/models.py`
2. Generate migration:
   ```bash
   docker compose exec backend alembic revision --autogenerate -m "deskripsi perubahan"
   ```
3. Cek file migration yang baru dibuat di `backend/alembic/versions/`, pastikan sesuai
4. Jalankan:
   ```bash
   docker compose exec backend alembic upgrade head
   ```

DBeaver tetap dipakai untuk **melihat/query data** (`SELECT`, browse tabel) — perubahan struktur tabel sebaiknya selalu lewat Alembic supaya tidak drift antara kode dan database aktual.

## Struktur folder

```
twoppals/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── app/
│   │   ├── core/            # users, roles, businesses
│   │   ├── cobi_kerupuk/    # kategori, produk, resep bervesi, stok, penjualan
│   │   ├── inventory/       # vendor, item, procurement, client
│   │   ├── main.py
│   │   ├── config.py
│   │   └── database.py
│   └── alembic/              # migration (autogenerate dari model)
└── frontend/
    └── src/
        ├── components/Sidebar.tsx   # menu dinamis dari API core/businesses
        ├── styles/tokens.css        # design token (warna, font, spacing)
        └── App.tsx                  # routing utama
```

## Menambah bisnis baru (di kemudian hari)

1. Insert row baru di tabel `core.businesses` (lewat endpoint atau langsung)
2. Buat schema Postgres baru (mis. `bisnis_baru`) + model SQLAlchemy + migration Alembic
3. Tambahkan folder modul baru di `backend/app/bisnis_baru/` mengikuti pola `cobi_kerupuk`/`inventory` (router, service, models, schemas)
4. Tambahkan entry `SUBMENU` di `frontend/src/components/Sidebar.tsx` dan route halaman baru di `App.tsx`

Sidebar otomatis menampilkan bisnis baru karena daftar bisnis diambil dinamis dari API, tidak hardcode.
