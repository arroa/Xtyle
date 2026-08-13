"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useEffect, useState } from "react";

import { FichaPdfViewer } from "@/components/ficha-pdf-viewer";
import { ConfirmDialog } from "@/components/confirm-dialog";

type ListedProduct = {
  id: string;
  brand: string;
  retailer: string;
  season: string;
  style: string;
  shortDescription: string;
  status: "BORRADOR" | "DEFINITIVA";
  version: number;
  updatedAt: string | Date;
  createdByEmail: string;
  designerName: string;
  canMutate: boolean;
};

type ProductsCatalogProps = {
  initialProducts: ListedProduct[];
  canCreate: boolean;
  canClone: boolean;
  canManageAll: boolean;
  currentUserEmail: string;
};

export function ProductsCatalog({
  initialProducts,
  canCreate,
  canClone,
  canManageAll,
  currentUserEmail,
}: ProductsCatalogProps) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ListedProduct | null>(
    null,
  );

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.brand.toLowerCase().includes(term) ||
        (p.retailer ?? "").toLowerCase().includes(term) ||
        (p.season ?? "").toLowerCase().includes(term) ||
        p.style.toLowerCase().includes(term) ||
        p.shortDescription.toLowerCase().includes(term) ||
        (p.designerName ?? "").toLowerCase().includes(term),
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
      setSuccess(`Copia creada: ${data.product.style}`);
      router.push(`/products/${data.product.id}`);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;
    setBusyId(pendingDelete.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${pendingDelete.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo eliminar.");
        return;
      }
      setProducts((prev) => prev.filter((p) => p.id !== pendingDelete.id));
      setSuccess(`Eliminada: ${pendingDelete.style}`);
      setPendingDelete(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function refresh() {
    const res = await fetch("/api/products");
    const data = (await res.json()) as {
      products?: Array<
        Omit<ListedProduct, "canMutate"> & {
          createdByEmail?: string;
          designerName?: string;
        }
      >;
    };
    if (res.ok && data.products) {
      setProducts(
        data.products.map((product) => ({
          ...product,
          createdByEmail: product.createdByEmail ?? "",
          designerName: product.designerName ?? "",
          canMutate:
            canManageAll ||
            (canCreate &&
              (product.createdByEmail ?? "").toLowerCase() ===
                currentUserEmail.toLowerCase()),
        })),
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de fichas. Crea con los datos principales; páginas Labels /
            Size Specs / Collage.
          </p>
        </div>
        {canCreate ? (
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
          placeholder="Buscar por Marca, Style, editor o descripción…"
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
        <table className="w-full table-fixed text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="w-[10%] px-4 py-3 font-medium">Marca</th>
              <th className="w-[9%] px-4 py-3 font-medium">Retailer</th>
              <th className="w-[8%] px-4 py-3 font-medium">Temp.</th>
              <th className="w-[14%] px-4 py-3 font-medium">Style</th>
              <th className="w-[10%] px-4 py-3 font-medium">Editor</th>
              <th className="w-[14%] px-4 py-3 font-medium">Descripción</th>
              <th className="w-[8%] px-4 py-3 font-medium">Estado</th>
              <th className="w-[5%] px-4 py-3 font-medium">Ver.</th>
              <th className="w-[22%] px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Aún no hay productos.
                </td>
              </tr>
            ) : (
              filtered.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="truncate px-4 py-3" title={product.brand || undefined}>
                    {product.brand || "—"}
                  </td>
                  <td className="truncate px-4 py-3" title={product.retailer || undefined}>
                    {product.retailer || "—"}
                  </td>
                  <td className="truncate px-4 py-3" title={product.season || undefined}>
                    {product.season || "—"}
                  </td>
                  <td className="truncate px-4 py-3 font-medium" title={product.style}>
                    {product.style}
                  </td>
                  <td className="truncate px-4 py-3" title={product.designerName || undefined}>
                    {product.designerName || "—"}
                  </td>
                  <td
                    className="truncate px-4 py-3 text-muted-foreground"
                    title={product.shortDescription}
                  >
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
                      <button
                        type="button"
                        onClick={() =>
                          setPreview({
                            id: product.id,
                            title: product.brand
                              ? `${product.brand} · ${product.style}`
                              : product.style,
                          })
                        }
                        className="text-xs underline-offset-2 hover:underline"
                      >
                        Ver Ficha
                      </button>
                      {canClone ? (
                        <button
                          type="button"
                          disabled={busyId === product.id}
                          onClick={() => void handleClone(product.id)}
                          className="text-xs underline-offset-2 hover:underline disabled:opacity-40"
                        >
                          {busyId === product.id ? "Clonando…" : "Clonar"}
                        </button>
                      ) : null}
                      {product.canMutate ? (
                        <button
                          type="button"
                          disabled={busyId === product.id}
                          onClick={() => setPendingDelete(product)}
                          className="text-xs text-destructive underline-offset-2 hover:underline disabled:opacity-40"
                        >
                          Eliminar
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

      <FichaPdfViewer
        open={Boolean(preview)}
        productId={preview?.id ?? ""}
        title={preview?.title ?? "Ficha"}
        onClose={() => setPreview(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Eliminar ficha"
        description={
          pendingDelete
            ? `Se eliminará “${pendingDelete.style}”${
                pendingDelete.brand ? ` (${pendingDelete.brand})` : ""
              }. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        busy={Boolean(pendingDelete && busyId === pendingDelete.id)}
        onCancel={() => {
          if (!busyId) setPendingDelete(null);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
