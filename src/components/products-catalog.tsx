"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type ListedProduct = {
  id: string;
  brand: string;
  style: string;
  shortDescription: string;
  status: "BORRADOR" | "DEFINITIVA";
  version: number;
  updatedAt: string | Date;
};

type ProductsCatalogProps = {
  initialProducts: ListedProduct[];
  canEdit: boolean;
};

export function ProductsCatalog({
  initialProducts,
  canEdit,
}: ProductsCatalogProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.brand.toLowerCase().includes(term) ||
        p.style.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term),
    );
  }, [products, q]);

  async function handleClone(id: string) {
    setBusyId(id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${id}/clone`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        product?: { id: string; style: string };
      } | null;
      if (!res.ok || !data?.product) {
        setError(data?.error ?? "No se pudo clonar.");
        return;
      }
      setSuccess(`Clonado: ${data.product.style}`);
      router.push(`/products/${data.product.id}`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function refresh() {
    const res = await fetch("/api/products");
    const data = (await res.json()) as { products?: ListedProduct[] };
    if (res.ok && data.products) setProducts(data.products);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de fichas. Alta con plantilla base en Borrador.
          </p>
        </div>
        {canEdit ? (
          <Link
            href="/products/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Nuevo producto
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por Marca, Style o descripción…"
          className="min-w-[16rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Actualizar
        </button>
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Marca</th>
              <th className="px-4 py-3 font-medium">Style</th>
              <th className="px-4 py-3 font-medium">Descripción</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Ver.</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No hay productos todavía.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="px-4 py-3">{product.brand || "—"}</td>
                  <td className="px-4 py-3 font-medium">{product.style}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {product.shortDescription}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        product.status === "BORRADOR"
                          ? "text-amber-300"
                          : "text-emerald-400"
                      }
                    >
                      {product.status === "BORRADOR" ? "Borrador" : "Definitiva"}
                    </span>
                  </td>
                  <td className="px-4 py-3">v{product.version}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <Link
                        href={`/products/${product.id}`}
                        className="text-xs underline-offset-2 hover:underline"
                      >
                        Abrir
                      </Link>
                      {canEdit ? (
                        <button
                          type="button"
                          disabled={busyId === product.id}
                          onClick={() => void handleClone(product.id)}
                          className="text-xs underline-offset-2 hover:underline disabled:opacity-40"
                        >
                          {busyId === product.id ? "Clonando…" : "Clonar"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
