import { useQuery } from "@tanstack/react-query";
import { NavLink } from "react-router-dom";
import { apiGet, Business } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { logout } from "../lib/auth";

interface Me {
  full_name: string;
  role: string;
}

// Sub-menu tiap modul masih didefinisikan di frontend (fitur spesifik per bisnis),
// tapi DAFTAR BISNIS-nya sendiri dinamis dari API -> nambah bisnis baru tidak perlu
// deploy ulang struktur menu utama, cukup daftarkan sub-menunya di sini.
const SUBMENU: Record<string, { label: string; path: string }[]> = {
  cobi_kerupuk: [
    { label: "Dashboard", path: "/cobi-kerupuk" },
    { label: "Kategori & produk", path: "/cobi-kerupuk/produk" },
    { label: "Customer", path: "/cobi-kerupuk/customer" },
    { label: "Pemesanan", path: "/cobi-kerupuk/pemesanan" },
    { label: "Bahan Baku", path: "/cobi-kerupuk/bahan-baku" },
    { label: "Kemasan & Label", path: "/cobi-kerupuk/kemasan" },
    { label: "Resep & COGS", path: "/cobi-kerupuk/resep" },
    { label: "Overhead", path: "/cobi-kerupuk/overhead" },
    { label: "Stok", path: "/cobi-kerupuk/stok" },
    { label: "Penjualan", path: "/cobi-kerupuk/penjualan" },
  ],
  inventory: [
    { label: "Dashboard", path: "/inventory" },
    { label: "Pengadaan", path: "/inventory/pengadaan" },
    { label: "Barang & vendor", path: "/inventory/barang" },
    { label: "Client & order", path: "/inventory/client" },
  ],
};

export default function Sidebar() {
  const { data: businesses } = useQuery({
    queryKey: ["businesses"],
    queryFn: () => apiGet<Business[]>("/core/businesses"),
  });

  const navigate = useNavigate();
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiGet<Me>("/core/auth/me"),
  });

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <aside
      style={{
        width: 230,
        background: "var(--color-surface-2)",
        borderRight: "1px solid var(--color-border)",
        padding: "16px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 8px 16px",
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: "var(--color-accent-bg)",
            color: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          TP
        </div>
        <span style={{ fontWeight: 500, fontSize: 15 }}>twoppals</span>
      </div>

      {businesses?.map((biz) => (
        <div key={biz.code} style={{ marginTop: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 500, padding: "8px 10px" }}>
            {biz.name}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              paddingLeft: 20,
            }}
          >
            {SUBMENU[biz.code]?.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                style={({ isActive }) => ({
                  padding: "6px 10px",
                  fontSize: 12.5,
                  borderRadius: 6,
                  textDecoration: "none",
                  color: isActive
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                  background: isActive
                    ? "var(--color-accent-bg)"
                    : "transparent",
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      ))}

      <div
        style={{
          marginTop: "auto",
          padding: "8px 10px",
          fontSize: 13,
          color: "var(--color-text-secondary)",
        }}
      >
        + Tambah bisnis baru
      </div>

      <div
        style={{
          borderTop: "1px solid var(--color-border)",
          marginTop: 8,
          padding: "10px 10px 4px",
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {me?.full_name ?? "..."}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            marginBottom: 8,
          }}
        >
          {me?.role ?? ""}
        </div>
        <button onClick={handleLogout} style={{ width: "100%", fontSize: 12 }}>
          Keluar
        </button>
      </div>
    </aside>
  );
}
