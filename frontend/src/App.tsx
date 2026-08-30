import { Outlet, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Login from "./routes/Login";
import Resep from "./routes/cobi-kerupuk/Resep";
import Produk from "./routes/cobi-kerupuk/Produk";
import BahanBaku from "./routes/cobi-kerupuk/BahanBaku";
import OverheadPage from "./routes/cobi-kerupuk/Overhead";
import CustomerPage from "./routes/cobi-kerupuk/Customer";
import Pemesanan from "./routes/cobi-kerupuk/Pemesanan";

function PlaceholderPage({ title }: { title: string }) {
  return <div style={{ padding: 24 }}><h2 style={{ fontSize: 18, fontWeight: 500 }}>{title}</h2></div>;
}

function AppLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{ flex: 1 }}><Outlet /></main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<PlaceholderPage title="Dashboard utama" />} />
          <Route path="/cobi-kerupuk" element={<PlaceholderPage title="Cobi Kerupuk" />} />
          <Route path="/cobi-kerupuk/produk" element={<Produk />} />
          <Route path="/cobi-kerupuk/customer" element={<CustomerPage />} />
          <Route path="/cobi-kerupuk/pemesanan" element={<Pemesanan />} />
          <Route path="/cobi-kerupuk/bahan-baku" element={<BahanBaku />} />
          <Route path="/cobi-kerupuk/resep" element={<Resep />} />
          <Route path="/cobi-kerupuk/overhead" element={<OverheadPage />} />
          <Route path="/cobi-kerupuk/stok" element={<PlaceholderPage title="Stok" />} />
          <Route path="/cobi-kerupuk/penjualan" element={<PlaceholderPage title="Penjualan" />} />
          <Route path="/inventory" element={<PlaceholderPage title="Inventory" />} />
          <Route path="/inventory/pengadaan" element={<PlaceholderPage title="Pengadaan" />} />
          <Route path="/inventory/barang" element={<PlaceholderPage title="Barang & vendor" />} />
          <Route path="/inventory/client" element={<PlaceholderPage title="Client & order" />} />
        </Route>
      </Route>
    </Routes>
  );
}