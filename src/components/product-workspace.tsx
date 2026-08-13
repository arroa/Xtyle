"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { CoverSheet } from "@/components/cover-sheet";
import { FichaPdfViewer } from "@/components/ficha-pdf-viewer";
import { PagesRail } from "@/components/pages-rail";
import { type CoverData, type CoverSection, type ProductPage } from "@/lib/product-types";
import { cn } from "@/lib/utils";

type ProductView = {
  id: string;
  brand: string;
  retailer: string;
  season: string;
  style: string;
  shortDescription: string;
  status: "BORRADOR" | "DEFINITIVA";
  version: number;
  cover: {
    data: CoverData;
    images: CoverSection["images"];
  };
  pages: ProductPage[];
};

type Suggestions = {
  brands: string[];
  retailers: string[];
  seasons: string[];
  collageTitles: string[];
};

type DesignerOption = {
  name: string;
  email: string;
};

type ProductWorkspaceProps = {
  product: ProductView;
  suggestions: Suggestions;
  canEdit: boolean;
  canReassignDesigner: boolean;
  designers: DesignerOption[];
  createdByEmail: string;
};

export function ProductWorkspace({
  product,
  suggestions,
  canEdit,
  canReassignDesigner,
  designers,
  createdByEmail,
}: ProductWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"cover" | "pages">("cover");
  const [showPdf, setShowPdf] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const locked = !canEdit || product.status !== "BORRADOR";

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  async function handleRelease() {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${product.id}/release`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo pasar a Definitiva.");
        setConfirmRelease(false);
        return;
      }
      setConfirmRelease(false);
      setSuccess("Ficha marcada como Definitiva.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo eliminar.");
        setConfirmDelete(false);
        return;
      }
      router.push("/products");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.retailer} · {product.season} ·{" "}
            {product.status === "BORRADOR" ? "Borrador" : "Definitiva"} · v
            {product.version}
          </p>
          <h1 className="font-display text-2xl text-foreground">
            {product.brand ? `${product.brand} · ` : ""}
            {product.style}
          </h1>
          <p className="text-sm text-muted-foreground">
            {product.shortDescription}
          </p>
          {!canEdit ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Solo lectura en esta ficha.
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPdf(true)}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Ver Ficha
          </button>
          {canEdit && product.status === "BORRADOR" ? (
            <button
              type="button"
              onClick={() => setConfirmRelease(true)}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Marcar Definitiva
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              Eliminar ficha
            </button>
          ) : null}
          <Link
            href="/products"
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <nav className="flex flex-wrap gap-2">
        {(
          [
            ["cover", "Carátula"],
            ["pages", "Páginas"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              tab === key
                ? "bg-primary/15 font-medium text-foreground"
                : "border border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-border bg-card p-5">
        {tab === "cover" ? (
          <CoverSheet
            productId={product.id}
            initial={product.cover.data}
            initialImages={product.cover.images}
            suggestions={suggestions}
            locked={locked}
            canReassignDesigner={canReassignDesigner}
            designers={designers}
            ownerEmail={createdByEmail}
          />
        ) : (
          <PagesRail
            productId={product.id}
            initialPages={product.pages}
            collageTitles={suggestions.collageTitles}
            canEdit={canEdit}
            isDraft={product.status === "BORRADOR"}
          />
        )}
      </div>

      <FichaPdfViewer
        open={showPdf}
        productId={product.id}
        title={
          product.brand
            ? `${product.brand} · ${product.style}`
            : product.style
        }
        onClose={() => setShowPdf(false)}
      />

      <ConfirmDialog
        open={confirmRelease}
        title="Marcar como Definitiva"
        description={`“${product.style}” pasará a Definitiva. Dejará de poder editarse. Para modificarla después, clónala o crea una nueva versión.`}
        confirmLabel="Marcar Definitiva"
        cancelLabel="Cancelar"
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmRelease(false);
        }}
        onConfirm={() => void handleRelease()}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar ficha"
        description={`Se eliminará “${product.style}”${
          product.brand ? ` (${product.brand})` : ""
        }. Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmDelete(false);
        }}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
