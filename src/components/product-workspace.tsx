"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CollagesRail } from "@/components/collages-rail";
import {
  PRODUCT_SECTIONS,
  sectionLabel,
  type ProductSection,
} from "@/lib/product-types";
import { cn } from "@/lib/utils";

type ProductView = {
  id: string;
  brand: string;
  style: string;
  shortDescription: string;
  status: "BORRADOR" | "DEFINITIVA";
  version: number;
  cover: {
    data: Record<string, unknown>;
    images: Record<string, unknown>;
  };
  label: { images: Record<string, unknown> };
  sizeTable: { rows: unknown[]; sourceFile?: unknown };
  sizeCuts: { images: Record<string, unknown> };
  collages: { id: string; title: string; images: unknown[] }[];
};

type ProductWorkspaceProps = {
  product: ProductView;
  canEdit: boolean;
};

function filledSlots(images: Record<string, unknown> | undefined) {
  if (!images) return 0;
  return Object.values(images).filter(Boolean).length;
}

export function ProductWorkspace({ product, canEdit }: ProductWorkspaceProps) {
  const [section, setSection] = useState<ProductSection>("cover");
  const [brand, setBrand] = useState(product.brand);
  const [style, setStyle] = useState(product.style);
  const [shortDescription, setShortDescription] = useState(
    product.shortDescription,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const progress = useMemo(() => {
    return {
      cover: {
        data: Object.values(product.cover.data).filter(
          (v) =>
            (typeof v === "string" && v.trim()) ||
            (Array.isArray(v) && v.length > 0),
        ).length,
        images: filledSlots(product.cover.images),
      },
      label: { images: filledSlots(product.label.images) },
      sizeTable: {
        rows: product.sizeTable.rows?.length ?? 0,
        hasExcel: Boolean(product.sizeTable.sourceFile),
      },
      sizeCuts: { images: filledSlots(product.sizeCuts.images) },
      collages: product.collages.length,
    };
  }, [product]);

  async function saveBasics(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit || product.status !== "BORRADOR") return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, style, shortDescription }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo guardar.");
        return;
      }
      setSuccess("Datos básicos guardados.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Producto · {product.status === "BORRADOR" ? "Borrador" : "Definitiva"}{" "}
            · v{product.version}
          </p>
          <h1 className="font-display text-2xl text-foreground">
            {product.brand ? `${product.brand} · ` : ""}
            {product.style}
          </h1>
          <p className="text-sm text-muted-foreground">
            {product.shortDescription}
          </p>
        </div>
        <Link
          href="/products"
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Volver al catálogo
        </Link>
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <nav className="flex flex-wrap gap-2">
        {PRODUCT_SECTIONS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              section === key
                ? "bg-primary/15 font-medium text-foreground"
                : "border border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {sectionLabel(key)}
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-border bg-card p-5">
        {section === "cover" ? (
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-lg">Carátula</h2>
              <p className="text-sm text-muted-foreground">
                Plantilla fija: datos + slots de imagen. Ahora editas lo básico;
                Excel e imágenes vienen después.
              </p>
            </div>
            <form onSubmit={saveBasics} className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Marca</span>
                <input
                  value={brand}
                  disabled={!canEdit || product.status !== "BORRADOR"}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 disabled:opacity-60"
                />
              </label>
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Style</span>
                <input
                  value={style}
                  disabled={!canEdit || product.status !== "BORRADOR"}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 disabled:opacity-60"
                />
              </label>
              <label className="block space-y-1 text-sm sm:col-span-2">
                <span className="text-muted-foreground">Short Description</span>
                <input
                  value={shortDescription}
                  disabled={!canEdit || product.status !== "BORRADOR"}
                  onChange={(e) => setShortDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 disabled:opacity-60"
                />
              </label>
              {canEdit && product.status === "BORRADOR" ? (
                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
                  >
                    {busy ? "Guardando…" : "Guardar básicos"}
                  </button>
                </div>
              ) : null}
            </form>
            <p className="text-xs text-muted-foreground">
              Progreso plantilla: {progress.cover.data} campos con dato ·{" "}
              {progress.cover.images}/5 imágenes
            </p>
          </div>
        ) : null}

        {section === "label" ? (
          <div className="space-y-2">
            <h2 className="font-display text-lg">Etiqueta</h2>
            <p className="text-sm text-muted-foreground">
              Estructura fija: espera 2 imágenes. Slot listo en plantilla (
              {progress.label.images}/2).
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {["Imagen 1", "Imagen 2"].map((label) => (
                <div
                  key={label}
                  className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
                >
                  {label} · pendiente upload
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {section === "sizeTable" ? (
          <div className="space-y-2">
            <h2 className="font-display text-lg">SizeTable</h2>
            <p className="text-sm text-muted-foreground">
              Upload Excel con plantilla fija. Ahora:{" "}
              {progress.sizeTable.rows} filas · Excel{" "}
              {progress.sizeTable.hasExcel ? "cargado" : "pendiente"}.
            </p>
            <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
              Próximo: descargar plantilla + importar Excel
            </div>
          </div>
        ) : null}

        {section === "sizeCuts" ? (
          <div className="space-y-2">
            <h2 className="font-display text-lg">SizeCuts</h2>
            <p className="text-sm text-muted-foreground">
              Hoja fija: 1 o 2 imágenes ({progress.sizeCuts.images}/2).
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {["Diagrama 1", "Diagrama 2 (opcional)"].map((label) => (
                <div
                  key={label}
                  className="flex h-36 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground"
                >
                  {label} · pendiente upload
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {section === "collages" ? (
          <CollagesRail
            productId={product.id}
            initialCollages={product.collages}
            canEdit={canEdit}
            isDraft={product.status === "BORRADOR"}
          />
        ) : null}
      </div>
    </div>
  );
}
