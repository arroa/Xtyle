"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { ComboField } from "@/components/combo-field";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ImageDropzone } from "@/components/image-dropzone";
import { deleteProductFile, uploadProductFile } from "@/lib/product-image-api";
import {
  DEFAULT_LABELS_TITLE,
  DEFAULT_SIZE_SPEC_TITLE,
  MAX_COLLAGE_IMAGES,
  PAGE_KINDS,
  collageGrid,
  filledImageCount,
  pageKindLabel,
  type PageKind,
  type ProductPage,
} from "@/lib/product-types";
import { cn } from "@/lib/utils";

type PagesRailProps = {
  productId: string;
  initialPages: ProductPage[];
  collageTitles: string[];
  canEdit: boolean;
  isDraft: boolean;
};

export function PagesRail({
  productId,
  initialPages,
  collageTitles,
  canEdit,
  isDraft,
}: PagesRailProps) {
  const [pages, setPages] = useState(
    [...initialPages].sort((a, b) => a.order - b.order),
  );
  const [activeId, setActiveId] = useState<string | null>(pages[0]?.id ?? null);
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<PageKind>("labels");
  const [title, setTitle] = useState(DEFAULT_LABELS_TITLE);
  const [busy, setBusy] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const skipClickRef = useRef(false);
  const uploadChain = useRef(Promise.resolve());

  const activeIndex = useMemo(
    () => pages.findIndex((page) => page.id === activeId),
    [pages, activeId],
  );
  const active = activeIndex >= 0 ? pages[activeIndex] : null;

  useEffect(() => {
    setPages([...initialPages].sort((a, b) => a.order - b.order));
  }, [productId]);

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  function selectKind(next: PageKind) {
    setKind(next);
    if (next === "labels") setTitle(DEFAULT_LABELS_TITLE);
    else if (next === "sizeSpec") setTitle(DEFAULT_SIZE_SPEC_TITLE);
    else setTitle("");
  }

  async function handleCreate() {
    if (!canEdit || !isDraft) return;
    if (kind === "collage" && !title.trim()) {
      setError("El collage necesita un título de catálogo.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${productId}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, title: title.trim() }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        page?: ProductPage;
      } | null;
      if (!res.ok || !data?.page) {
        setError(data?.error ?? "No se pudo crear la página.");
        return;
      }
      setPages((prev) => [...prev, data.page!]);
      setActiveId(data.page.id);
      setCreating(false);
      setSuccess("Página creada.");
    } finally {
      setBusy(false);
    }
  }

  function movePage(list: ProductPage[], fromId: string, toId: string) {
    const from = list.findIndex((page) => page.id === fromId);
    const to = list.findIndex((page) => page.id === toId);
    if (from < 0 || to < 0 || from === to) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next.map((page, index) => ({ ...page, order: index }));
  }

  async function persistOrder(next: ProductPage[]) {
    const previous = pages;
    setPages(next);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/products/${productId}/pages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageIds: next.map((page) => page.id) }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        pages?: ProductPage[];
      } | null;
      if (!res.ok) {
        setPages(previous);
        setError(data?.error ?? "No se pudo reordenar.");
        return;
      }
      if (data?.pages) setPages(data.pages);
    } finally {
      setBusy(false);
      setDragId(null);
      setOverId(null);
    }
  }

  async function handleDelete() {
    if (!active || !canEdit || !isDraft) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(
        `/api/products/${productId}/pages/${active.id}`,
        { method: "DELETE" },
      );
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        pages?: ProductPage[];
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo eliminar.");
        return;
      }
      const next = data?.pages ?? pages.filter((page) => page.id !== active.id);
      setPages(next);
      setActiveId(next[0]?.id ?? null);
      setConfirmDelete(false);
      setSuccess("Página eliminada.");
    } finally {
      setBusy(false);
    }
  }

  function applyPage(page: ProductPage) {
    setPages((prev) => prev.map((item) => (item.id === page.id ? page : item)));
  }

  async function refreshPages() {
    const res = await fetch(`/api/products/${productId}`);
    const data = (await res.json().catch(() => null)) as {
      product?: { pages?: ProductPage[] };
    } | null;
    if (data?.product?.pages) {
      setPages([...data.product.pages].sort((a, b) => a.order - b.order));
    }
  }

  async function uploadPageFiles(
    page: ProductPage,
    files: File[],
    index?: number,
  ) {
    if (!canEdit || !isDraft || files.length === 0) return;
    const job = uploadChain.current.then(() =>
      runUploadPageFiles(page.id, files, index),
    );
    uploadChain.current = job.then(
      () => undefined,
      () => undefined,
    );
    await job;
  }

  async function runUploadPageFiles(
    pageId: string,
    files: File[],
    index?: number,
  ) {
    setError("");
    setSuccess("");
    for (const file of files) {
      const key = index == null ? `${pageId}:add` : `${pageId}:${index}`;
      setBusyKey(key);
      setBusy(true);
      try {
        const fields: Record<string, string> = {
          target: "page",
          pageId,
        };
        if (index != null) fields.index = String(index);
        const result = await uploadProductFile(productId, fields, file);
        if (result.error) {
          setError(result.error);
          break;
        }
        if (result.page) applyPage(result.page);
        else if (result.pages) setPages(result.pages);
        setSuccess("Imagen subida.");
      } finally {
        setBusy(false);
        setBusyKey(null);
      }
    }
    await refreshPages();
  }

  async function removePageImage(page: ProductPage, index: number) {
    if (!canEdit || !isDraft) return;
    setBusy(true);
    setBusyKey(`${page.id}:${index}`);
    setError("");
    setSuccess("");
    try {
      const result = await deleteProductFile(productId, {
        target: "page",
        pageId: page.id,
        index,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.page) applyPage(result.page);
      else if (result.pages) setPages(result.pages);
      setSuccess("Imagen quitada.");
    } finally {
      setBusy(false);
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Páginas</h2>
          <p className="text-sm text-muted-foreground">
            Labels (2 imágenes), Size Specs (1 imagen) o Collage (N imágenes).
            {canEdit && isDraft ? " Arrastra las tarjetas para reordenar." : ""}
          </p>
        </div>
        {canEdit && isDraft ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setCreating((open) => !open);
              setError("");
            }}
            className="text-sm font-medium text-primary hover:underline disabled:opacity-60"
          >
            {creating ? "Cancelar" : "+ Nueva página"}
          </button>
        ) : null}
      </div>

      {creating ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex flex-wrap gap-2">
            {PAGE_KINDS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => selectKind(item)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  kind === item
                    ? "bg-primary/15 font-medium text-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {pageKindLabel(item)}
              </button>
            ))}
          </div>
          {kind === "collage" ? (
            <ComboField
              id="collage-title"
              label="Título PAGE"
              value={title}
              onChange={setTitle}
              options={collageTitles}
              placeholder="Details, Fit Picture…"
              required
            />
          ) : (
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Título PAGE</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              />
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            {kind === "labels"
              ? "Plantilla fija: dos imágenes, una encima de la otra."
              : kind === "sizeSpec"
                ? "Una imagen a página completa. Si necesitas otra, crea otra página Size Specs."
                : "Varias imágenes; el algoritmo las ordena. El título se toma del catálogo definido por el usuario."}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleCreate()}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Creando…" : "Crear página"}
          </button>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {pages.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">
            Aún no hay páginas. La Carátula ya existe; aquí se agregan Labels,
            Size Specs y Collages.
          </p>
        ) : (
          pages.map((page, index) => {
            const selected = page.id === activeId;
            const dragging = dragId === page.id;
            const over = overId === page.id && dragId && dragId !== page.id;
            const canDrag = canEdit && isDraft;
            return (
              <button
                key={page.id}
                type="button"
                draggable={canDrag}
                onClick={() => {
                  if (skipClickRef.current) {
                    skipClickRef.current = false;
                    return;
                  }
                  setActiveId(page.id);
                }}
                onDragStart={(event) => {
                  if (!canDrag) return;
                  setDragId(page.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", page.id);
                }}
                onDragOver={(event) => {
                  if (!canDrag || !dragId) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (overId !== page.id) setOverId(page.id);
                }}
                onDrop={(event) => {
                  if (!canDrag || !dragId) return;
                  event.preventDefault();
                  skipClickRef.current = true;
                  const next = movePage(pages, dragId, page.id);
                  if (next === pages) {
                    setDragId(null);
                    setOverId(null);
                    return;
                  }
                  void persistOrder(next);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={cn(
                  "max-w-56 rounded-lg px-3 py-2 text-left text-sm transition",
                  canDrag ? "cursor-grab active:cursor-grabbing" : "",
                  selected
                    ? "bg-primary/15 text-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted",
                  dragging ? "opacity-40" : "",
                  over ? "ring-2 ring-primary/60" : "",
                )}
              >
                <span className="block text-[11px] uppercase tracking-wide opacity-70">
                  {index + 1} · {pageKindLabel(page.kind)}
                </span>
                <span className="block truncate font-medium">
                  {page.title || pageKindLabel(page.kind)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {active ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{active.title}</p>
              <p className="text-sm text-muted-foreground">
                {pageKindLabel(active.kind)} ·{" "}
                {filledImageCount(active.images)} /{" "}
                {active.kind === "labels"
                  ? 2
                  : active.kind === "sizeSpec"
                    ? 1
                    : "N"}{" "}
                imágenes
              </p>
            </div>
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

          {active.kind === "labels" ? (
            <div className="grid gap-3">
              {["Imagen superior", "Imagen inferior"].map((label, index) => (
                <ImageDropzone
                  key={`${active.id}-${index}`}
                  label={label}
                  hint="Haz clic, arrastra o pega (Ctrl+V)"
                  locked={!canEdit || !isDraft}
                  busy={busyKey === `${active.id}:${index}`}
                  slot={active.images[index]}
                  className="min-h-48"
                  onUpload={(files) => uploadPageFiles(active, files, index)}
                  onRemove={() => removePageImage(active, index)}
                />
              ))}
            </div>
          ) : null}

          {active.kind === "sizeSpec" ? (
            <ImageDropzone
              key={active.id}
              label="Size Spec"
              hint="Pega una captura del Excel (Ctrl+V) o sube un archivo"
              captureWindowPaste={canEdit && isDraft}
              locked={!canEdit || !isDraft}
              busy={busyKey === `${active.id}:0`}
              slot={active.images[0]}
              className="min-h-80"
              onUpload={(files) => uploadPageFiles(active, files, 0)}
              onRemove={() => removePageImage(active, 0)}
            />
          ) : null}

          {active.kind === "collage" ? (
            <CollageBoard
              page={active}
              locked={!canEdit || !isDraft}
              busyKey={busyKey}
              onUpload={(files, index) =>
                uploadPageFiles(active, files, index)
              }
              onRemove={(index) => removePageImage(active, index)}
            />
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar página"
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

function CollageBoard({
  page,
  locked,
  busyKey,
  onUpload,
  onRemove,
}: {
  page: ProductPage;
  locked: boolean;
  busyKey: string | null;
  onUpload: (files: File[], index?: number) => void;
  onRemove: (index: number) => void;
}) {
  const filled = filledImageCount(page.images);
  const grid = collageGrid(Math.max(page.images.length, 1));
  const canAdd = !locked && filled < MAX_COLLAGE_IMAGES;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Hasta {MAX_COLLAGE_IMAGES} imágenes. El PDF las organiza en una
        cuadrícula automática.
      </p>
      {filled ? (
        <div
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]"
          style={{ ["--cols" as string]: String(grid.cols) }}
        >
          {page.images.map((slot, index) => (
            <ImageDropzone
              key={`${page.id}-${index}-${slot.publicId ?? slot.url ?? index}`}
              label={`Foto ${index + 1}`}
              locked={locked}
              busy={busyKey === `${page.id}:${index}`}
              slot={slot}
              className="min-h-40"
              onUpload={(files) => onUpload(files, index)}
              onRemove={() => onRemove(index)}
            />
          ))}
        </div>
      ) : null}
      {canAdd ? (
        <ImageDropzone
          label="Agregar al collage"
          hint="Puedes subir varias a la vez"
          multiple
          locked={locked}
          busy={busyKey === `${page.id}:add`}
          slot={null}
          className="min-h-28"
          onUpload={(files) => onUpload(files)}
        />
      ) : null}
    </div>
  );
}
