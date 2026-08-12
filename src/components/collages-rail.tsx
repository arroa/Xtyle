"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";

export type CollageItem = {
  id: string;
  title?: string;
  images: unknown[];
  order?: number;
};

type CollagesRailProps = {
  productId: string;
  initialCollages: CollageItem[];
  canEdit: boolean;
  isDraft: boolean;
};

export function CollagesRail({
  productId,
  initialCollages,
  canEdit,
  isDraft,
}: CollagesRailProps) {
  const [collages, setCollages] = useState(
    [...initialCollages].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  );
  const [activeId, setActiveId] = useState<string | null>(
    collages[0]?.id ?? null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeIndex = useMemo(
    () => collages.findIndex((c) => c.id === activeId),
    [collages, activeId],
  );
  const active = activeIndex >= 0 ? collages[activeIndex] : null;

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  async function handleNew() {
    if (!canEdit || !isDraft) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${productId}/collages`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        collage?: CollageItem;
      } | null;
      if (!res.ok || !data?.collage) {
        setError(data?.error ?? "No se pudo crear el collage.");
        return;
      }
      setCollages((prev) => [...prev, data.collage!]);
      setActiveId(data.collage.id);
      setSuccess("Página de collage creada.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!active || !canEdit || !isDraft) return;

    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/products/${productId}/collages/${active.id}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        collages?: CollageItem[];
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo eliminar.");
        return;
      }
      const next = data?.collages ?? collages.filter((c) => c.id !== active.id);
      setCollages(next);
      setActiveId(next[0]?.id ?? null);
      setConfirmDelete(false);
      setSuccess("Página eliminada.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Collages</h2>
          <p className="text-sm text-muted-foreground">
            Páginas del PDF, sin título. Seleccione una en el carril; el trabajo
            se realiza abajo.
          </p>
        </div>
        {canEdit && isDraft ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleNew()}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
          >
            + Nuevo collage
          </button>
        ) : null}
      </div>

      {success ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {collages.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Aún no hay páginas. Cree la primera con “Nuevo collage”.
          </p>
        ) : (
          collages.map((page, index) => {
            const selected = page.id === activeId;
            return (
              <button
                key={page.id}
                type="button"
                onClick={() => setActiveId(page.id)}
                className={cn(
                  "min-w-14 rounded-lg px-5 py-2 text-center text-sm font-semibold",
                  selected
                    ? "bg-primary/15 text-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {index + 1}
              </button>
            );
          })
        )}
      </div>

      {active ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Página {activeIndex + 1} · {active.images?.length ?? 0} imágenes
            </p>
            {canEdit && isDraft ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
                className="text-sm text-destructive hover:underline disabled:opacity-60"
              >
                Eliminar página
              </button>
            ) : null}
          </div>

          <div className="flex min-h-48 items-center justify-center border border-dashed border-border text-sm text-muted-foreground">
            Zona de trabajo del collage — subir imágenes (siguiente paso)
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title={`Eliminar página ${activeIndex + 1}`}
        description="Esta acción no se puede deshacer. La página se quitará del producto."
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
