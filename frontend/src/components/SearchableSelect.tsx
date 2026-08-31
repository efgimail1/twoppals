import { useEffect, useRef, useState } from "react";

export interface SearchableOption {
  value: number;
  label: string;
  sublabel?: string;
}

interface Props {
  options: SearchableOption[];
  value: number | null;
  onChange: (value: number) => void;
  placeholder?: string;
}

export default function SearchableSelect({ options, value, onChange, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <input
        value={open ? query : selected?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        placeholder={placeholder ?? "Cari..."}
        style={{ width: "100%" }}
      />
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "var(--color-surface-0)",
            border: "1px solid var(--color-border)",
            borderRadius: 8,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 20,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length === 0 && (
            <div style={{ padding: "8px 12px", fontSize: 12.5, color: "var(--color-text-muted)" }}>
              Tidak ditemukan
            </div>
          )}
          {filtered.map((o) => (
            <div
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setQuery("");
                setOpen(false);
              }}
              style={{
                padding: "8px 12px",
                fontSize: 13,
                cursor: "pointer",
                background: o.value === value ? "var(--color-accent-bg)" : "transparent",
              }}
            >
              <div>{o.label}</div>
              {o.sublabel && <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{o.sublabel}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
