"use client";

import { useEffect, useState } from "react";

type FichaPdfViewerProps = {
  open: boolean;
  productId: string;
  title: string;
  onClose: () => void;
};

export function FichaPdfViewer({
  open,
  productId,
  title,
  onClose,
}: FichaPdfViewerProps) {
  const [openedAt, setOpenedAt] = useState(0);
  const pdfUrl = `/api/products/${productId}/pdf?t=${openedAt}`;

  useEffect(() => {
    if (open) setOpenedAt(Date.now());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ficha-pdf-title"
        className="relative z-10 flex h-[min(92vh,920px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Vista PDF
            </p>
            <h2
              id="ficha-pdf-title"
              className="truncate font-display text-lg text-foreground"
            >
              {title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Abrir en pestaña
            </a>
            <a
              href={pdfUrl}
              download
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              Descargar
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              Cerrar
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 bg-muted/40">
          <iframe
            key={pdfUrl}
            title={`PDF · ${title}`}
            src={pdfUrl}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
