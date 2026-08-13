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
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:p-6">
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
        className="relative z-10 flex h-[100dvh] w-full max-w-5xl flex-col overflow-hidden border-border bg-card shadow-2xl sm:h-[min(92vh,920px)] sm:rounded-2xl sm:border"
      >
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
            >
              Abrir en pestaña
            </a>
            <a
              href={pdfUrl}
              download
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-3 text-sm hover:bg-muted"
            >
              Descargar
            </a>
            <button
              type="button"
              onClick={onClose}
              className="col-span-2 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground sm:col-span-1"
            >
              Cerrar
            </button>
          </div>
        </div>
        <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground sm:hidden">
          En el teléfono el PDF a veces no se incrusta. Si ves la pantalla
          vacía, usa Abrir en pestaña.
        </p>
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
