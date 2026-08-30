import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Customer, createCustomer, deleteCustomer, getCustomers, updateCustomer } from "../../lib/orders";

export default function CustomerPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [search, setSearch] = useState("");

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  const { data: customers } = useQuery({ queryKey: ["customers"], queryFn: getCustomers });
  const selected = customers?.find((c) => c.id === selectedId);

  useEffect(() => {
    if (selected) {
      setEditName(selected.name);
      setEditPhone(selected.phone ?? "");
      setEditAddress(selected.address ?? "");
    }
  }, [selected]);

  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowNewForm(false);
      setSelectedId(newCustomer.id);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: Parameters<typeof updateCustomer>[1] }) =>
      updateCustomer(vars.id, vars.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: (result, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (selectedId === deletedId) setSelectedId(null);
      if (!result.permanently_deleted) {
        alert("Customer ini sudah punya riwayat order, jadi tidak dihapus permanen (cuma dinonaktifkan).");
      }
    },
  });

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    createMutation.mutate({
      name: form.get("name") as string,
      phone: (form.get("phone") as string) || undefined,
    });
  }

  function handleSaveEdit() {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.id,
      data: { name: editName, phone: editPhone || undefined, address: editAddress || undefined },
    });
  }

  function handleDuplicate(c: Customer) {
    createMutation.mutate({ name: `${c.name} (copy)`, phone: c.phone ?? undefined, address: c.address ?? undefined });
  }

  function handleDelete(c: Customer) {
    if (window.confirm(`Hapus customer "${c.name}"?`)) {
      deleteMutation.mutate(c.id);
    }
  }

  const filtered = (customers ?? []).filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ padding: 24, display: "flex", gap: 16 }}>
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 500 }}>Customer</div>
          <button className="primary" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => setShowNewForm((v) => !v)}>
            <Plus size={13} style={{ verticalAlign: -2, marginRight: 3 }} />
            Baru
          </button>
        </div>

        {showNewForm && (
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
            <input name="name" placeholder="Nama customer" required />
            <input name="phone" placeholder="No. HP/WA (opsional)" />
            <button type="submit" className="primary">Simpan</button>
          </form>
        )}

        <input
          placeholder="Cari customer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <div style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, overflow: "hidden" }}>
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--color-border)",
                cursor: "pointer",
                background: selectedId === c.id ? "var(--color-accent-bg)" : "transparent",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: selectedId === c.id ? 500 : 400, color: selectedId === c.id ? "var(--color-accent)" : "var(--color-text-primary)" }}>
                {c.name}
              </div>
              <div style={{ fontSize: 11.5, color: selectedId === c.id ? "var(--color-accent)" : "var(--color-text-muted)" }}>
                {c.order_count} order{c.phone ? ` · ${c.phone}` : ""}
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
              Belum ada customer.
            </div>
          )}
        </div>
      </div>

      {selected ? (
        <div style={{ flex: 1, background: "var(--color-surface-2)", border: "1px solid var(--color-border)", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{selected.order_count} order tercatat</div>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              <button className="icon-btn" title="Duplikat" onClick={() => handleDuplicate(selected)}>
                <Copy size={14} />
              </button>
              <button className="icon-btn danger" title="Hapus" onClick={() => handleDelete(selected)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 560 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Nama</label>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={handleSaveEdit} style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>No. HP / WA</label>
              <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} onBlur={handleSaveEdit} style={{ width: "100%" }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>
                Alamat (opsional, untuk pengantaran)
              </label>
              <input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} onBlur={handleSaveEdit} style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
          Pilih customer di kiri, atau buat baru.
        </div>
      )}
    </div>
  );
}
