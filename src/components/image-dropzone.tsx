"use client";

import { useEffect, useRef, useState } from "react";

import { isFilledImage, type ImageSlot } from "@/lib/product-types";
import { cn } from "@/lib/utils";

type ImageDropzoneProps = {
  label: string;
  hint?: string;
  slot: ImageSlot | null | undefined;
  locked?: boolean;
  busy?: boolean;
  multiple?: boolean;
  captureWindowPaste?: boolean;
  variant?: "sheet" | "dark";
  className?: string;
  onUpload: (files: File[]) => Promise<void> | void;
  onRemove?: () => Promise<void> | void;
};

function filesFromList(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter((file) => file.type.startsWith("image/"));
}

export function ImageDropzone({
  label,
  hint,
  slot,
  locked,
  busy,
  multiple,
  captureWindowPaste,
  variant = "dark",
  className,
  onUpload,
  onRemove,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const takeRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const [over, setOver] = useState(false);
  const filled = isFilledImage(slot);
  const sheet = variant === "sheet";
  const disabled = Boolean(locked || busy);

  async function take(files: File[]) {
    if (disabled || files.length === 0) return;
    await onUpload(multiple ? files : files.slice(0, 1));
  }
  takeRef.current = take;

  useEffect(() => {
    if (!captureWindowPaste || disabled) return;
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const files = filesFromList(
        [...(event.clipboardData?.items ?? [])]
          .map((item) => item.getAsFile())
          .filter((file): file is File => Boolean(file)),
      );
      if (!files.length) return;
      event.preventDefault();
      void takeRef.current(files);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [captureWindowPaste, disabled]);

  return (
    <div
      aria-label={label}
      tabIndex={locked ? undefined : 0}
      onClick={() => {
        if (disabled) return;
        inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setOver(false);
        void take(filesFromList(event.dataTransfer.files));
      }}
      onPaste={(event) => {
        if (disabled) return;
        const files = filesFromList(
          [...event.clipboardData.items]
            .map((item) => item.getAsFile())
            .filter((file): file is File => Boolean(file)),
        );
        if (!files.length) return;
        event.preventDefault();
        void take(files);
      }}
      className={cn(
        "relative flex min-h-24 cursor-pointer flex-col items-center justify-center overflow-hidden outline-none",
        sheet
          ? "border border-dashed border-[#d0d0d0] bg-white text-[#8a8a8a]"
          : "rounded-lg border border-dashed border-border bg-muted/20 text-muted-foreground",
        over && !disabled ? "ring-2 ring-primary/70" : "",
        disabled ? "cursor-default" : "hover:opacity-95",
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/bmp"
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          void take(filesFromList(event.target.files));
          event.target.value = "";
        }}
      />

      {filled && slot?.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.url}
          alt={label}
          className="absolute inset-0 size-full object-contain"
        />
      ) : (
        <div className="px-3 py-4 text-center">
          <p
            className={cn(
              "text-[10px] font-semibold uppercase tracking-wide",
              sheet ? "text-[#6b6b6b]" : "text-muted-foreground",
            )}
          >
            {label}
          </p>
          <p className="mt-1 text-[11px] leading-snug">
            {busy
              ? "Subiendo…"
              : locked
                ? "Sin imagen"
                : (hint ?? "Haz clic, arrastra o pega (Ctrl+V)")}
          </p>
        </div>
      )}

      {filled && !locked ? (
        <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/55 px-2 py-1 text-[10px] text-white">
          <span>{busy ? "Subiendo…" : "Cambiar"}</span>
          {onRemove ? (
            <button
              type="button"
              disabled={busy}
              onClick={(event) => {
                event.stopPropagation();
                void onRemove();
              }}
              className="underline decoration-white/50 hover:decoration-white disabled:opacity-60"
            >
              Quitar
            </button>
          ) : null}
        </div>
      ) : null}

      {busy ? (
        <div className="absolute inset-0 bg-black/25" />
      ) : null}
    </div>
  );
}
