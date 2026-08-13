"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { ImageDropzone } from "@/components/image-dropzone";
import { deleteProductFile, uploadProductFile } from "@/lib/product-image-api";
import { personDisplayName } from "@/lib/person-name";
import {
  BRAND_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  DIVISION_OPTIONS,
  EXHIBITION_OPTIONS,
  FABRIC_TYPE_OPTIONS,
  PACKING_OPTIONS,
  SIZE_BREAKDOWN_OPTIONS,
  type CoverData,
  type CoverImageKey,
  type CoverSection,
} from "@/lib/product-types";
import { cn } from "@/lib/utils";

type CoverSheetProps = {
  productId: string;
  initial: CoverData;
  initialImages: CoverSection["images"];
  suggestions: {
    brands: string[];
    retailers: string[];
    seasons: string[];
  };
  locked: boolean;
  canReassignDesigner?: boolean;
  designers?: Array<{ name: string; email: string }>;
  ownerEmail?: string;
};

const sheetInput =
  "min-w-0 w-full max-w-full flex-1 overflow-hidden border-0 bg-transparent px-1 py-0 text-[11px] leading-tight text-[#1a1a1a] outline-none placeholder:text-[#b0b0b0] disabled:opacity-70";
const sheetLabel =
  "shrink-0 text-[8px] font-semibold uppercase tracking-wide text-[#6b6b6b]";

let measureCanvas: HTMLCanvasElement | undefined;

function textWidthPx(text: string, el: HTMLInputElement) {
  measureCanvas ??= document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  const style = window.getComputedStyle(el);
  ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  return ctx.measureText(text).width;
}

function valueFitsInput(el: HTMLInputElement, value: string) {
  const style = window.getComputedStyle(el);
  const pad =
    Number.parseFloat(style.paddingLeft || "0") +
    Number.parseFloat(style.paddingRight || "0");
  const available = Math.max(8, el.clientWidth - pad);
  return textWidthPx(value, el) <= available;
}

function longestFittingValue(el: HTMLInputElement, value: string) {
  if (valueFitsInput(el, value)) return value;
  let low = 0;
  let high = value.length;
  let best = "";
  while (low <= high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = value.slice(0, mid);
    if (valueFitsInput(el, candidate)) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function SheetLineInput({
  value,
  disabled,
  onChange,
  className,
  placeholder,
  list,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  list?: string;
}) {
  return (
    <input
      list={list}
      disabled={disabled}
      value={value}
      placeholder={placeholder}
      className={cn(sheetInput, className)}
      onChange={(event) => {
        const el = event.currentTarget;
        const next = el.value;
        if (next.length <= value.length) {
          onChange(next);
          return;
        }
        if (valueFitsInput(el, next)) {
          onChange(next);
          return;
        }
        if (next.startsWith(value)) {
          el.value = value;
          return;
        }
        const fitted = longestFittingValue(el, next);
        el.value = fitted;
        onChange(fitted);
      }}
    />
  );
}

function toggleValue(list: string[], value: string) {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function CheckOption({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-[#333]",
        disabled ? "cursor-default" : "hover:opacity-80",
      )}
    >
      <span
        className={cn(
          "inline-flex size-[11px] shrink-0 items-center justify-center border border-[#555]",
          selected ? "bg-[#e07a3d]" : "bg-white",
        )}
      >
        {selected ? (
          <span className="size-[5px] bg-[#1a1a1a]" />
        ) : null}
      </span>
      {label}
    </button>
  );
}

function OptionGroup({
  values,
  selected,
  disabled,
  nowrap,
  onToggle,
}: {
  values: readonly { value: string; label: string }[] | readonly string[];
  selected: string[];
  disabled?: boolean;
  nowrap?: boolean;
  onToggle: (value: string) => void;
}) {
  const items = values.map((item) =>
    typeof item === "string" ? { value: item, label: item } : item,
  );
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-x-2 gap-y-0.5",
        nowrap ? "flex-nowrap" : "flex-wrap",
      )}
    >
      {items.map((item) => (
        <CheckOption
          key={item.value}
          label={item.label}
          selected={selected.includes(item.value)}
          disabled={disabled}
          onClick={() => onToggle(item.value)}
        />
      ))}
    </div>
  );
}

function Cell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[22px] min-w-0 items-center gap-1.5 overflow-hidden border border-[#c8c8c8] bg-white px-1.5 py-0.5",
        className,
      )}
    >
      <p className={sheetLabel}>{label}</p>
      {children}
    </div>
  );
}

export function CoverSheet({
  productId,
  initial,
  initialImages,
  suggestions,
  locked,
  canReassignDesigner = false,
  designers = [],
  ownerEmail = "",
}: CoverSheetProps) {
  const [data, setData] = useState<CoverData>(initial);
  const [designerEmail, setDesignerEmail] = useState(ownerEmail);
  const [images, setImages] = useState(initialImages);
  const [busy, setBusy] = useState(false);
  const [busySlot, setBusySlot] = useState<CoverImageKey | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const designerOptions = [
    ...designers.filter(
      (item) => item.email.toLowerCase() !== designerEmail.toLowerCase(),
    ),
  ];
  const selectedName =
    personDisplayName(
      designers.find(
        (item) => item.email.toLowerCase() === designerEmail.toLowerCase(),
      )?.name,
    ) || personDisplayName(data.designer);
  if (designerEmail && selectedName) {
    designerOptions.unshift({
      email: designerEmail,
      name: selectedName,
    });
  }

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  function patch<K extends keyof CoverData>(key: K, value: CoverData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadSlot(slot: CoverImageKey, files: File[]) {
    const file = files[0];
    if (!file || locked) return;
    setBusySlot(slot);
    setError("");
    setSuccess("");
    try {
      const result = await uploadProductFile(
        productId,
        { target: "cover", slot },
        file,
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.coverImages) setImages(result.coverImages);
      setSuccess("Imagen subida.");
    } finally {
      setBusySlot(null);
    }
  }

  async function removeSlot(slot: CoverImageKey) {
    if (locked) return;
    setBusySlot(slot);
    setError("");
    setSuccess("");
    try {
      const result = await deleteProductFile(productId, {
        target: "cover",
        slot,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.coverImages) setImages(result.coverImages);
      setSuccess("Imagen quitada.");
    } finally {
      setBusySlot(null);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (locked) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: data.brand,
          retailer: data.retailer,
          season: data.season,
          style: data.style,
          shortDescription: data.shortDescription,
          cover: data,
          designerEmail: canReassignDesigner ? designerEmail : undefined,
        }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "No se pudo guardar la carátula.");
        return;
      }
      setSuccess("Carátula guardada.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-lg">Carátula</h2>
          <p className="text-sm text-muted-foreground">
            Completa los datos de la plantilla de la ficha. Las fotos se suben
            en las zonas (haz clic, arrastra o pega con Ctrl+V).
          </p>
        </div>
        {!locked ? (
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Guardando…" : "Guardar carátula"}
          </button>
        ) : null}
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <p className="mb-2 text-xs text-muted-foreground lg:hidden">
        Desliza hacia los lados para ver la carátula. En el teléfono, Ver Ficha
        es la forma más cómoda de leerla.
      </p>
      <div className="overflow-x-auto">
        <div className="mx-auto min-w-[52rem] max-w-4xl bg-[#f4f2ee] p-3 text-[#1a1a1a] shadow-xl">
          <div className="mb-1 grid min-w-0 grid-cols-3 items-center gap-2 bg-[#d8d8d8] px-3 py-2">
            <SheetLineInput
              list="cover-brand-options"
              disabled={locked}
              value={data.brand}
              onChange={(value) => patch("brand", value)}
              placeholder="Marca"
              className="bg-transparent font-display text-lg text-[#1a1a1a]"
            />
            <SheetLineInput
              list="cover-retailer-options"
              disabled={locked}
              value={data.retailer}
              onChange={(value) => patch("retailer", value)}
              placeholder="RETAILER"
              className="bg-transparent text-center font-display text-xl tracking-[0.2em] text-[#1a1a1a]"
            />
            <SheetLineInput
              list="cover-season-options"
              disabled={locked}
              value={data.season}
              onChange={(value) => patch("season", value)}
              placeholder="TEMPORADA"
              className="bg-transparent text-right text-sm font-semibold text-[#1a1a1a]"
            />
            <datalist id="cover-brand-options">
              {suggestions.brands.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="cover-retailer-options">
              {suggestions.retailers.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            <datalist id="cover-season-options">
              {suggestions.seasons.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>

          <div className="grid min-w-0 grid-cols-12">
            <Cell label="Short desc." className="col-span-3">
              <SheetLineInput
                disabled={locked}
                value={data.shortDescription}
                onChange={(value) => patch("shortDescription", value)}
              />
            </Cell>
            <Cell label="Style" className="col-span-4">
              <SheetLineInput
                disabled={locked}
                value={data.style}
                onChange={(value) => patch("style", value)}
              />
            </Cell>
            <Cell label="Evento" className="col-span-2">
              <SheetLineInput
                disabled={locked}
                value={data.evento}
                onChange={(value) => patch("evento", value)}
              />
            </Cell>
            <Cell label="Packing" className="col-span-3">
              <OptionGroup
                values={PACKING_OPTIONS}
                selected={data.packing}
                disabled={locked}
                onToggle={(value) =>
                  patch("packing", toggleValue(data.packing, value))
                }
              />
            </Cell>

            <Cell label="Type of fabric" className="col-span-7">
              <OptionGroup
                values={FABRIC_TYPE_OPTIONS}
                selected={data.fabricType}
                disabled={locked}
                onToggle={(value) =>
                  patch("fabricType", toggleValue(data.fabricType, value))
                }
              />
            </Cell>
            <Cell label="Exhibición" className="col-span-5">
              <OptionGroup
                values={EXHIBITION_OPTIONS}
                selected={data.exhibition}
                disabled={locked}
                onToggle={(value) =>
                  patch("exhibition", toggleValue(data.exhibition, value))
                }
              />
            </Cell>

            <Cell label="Main fabric" className="col-span-8">
              <SheetLineInput
                disabled={locked}
                value={data.mainFabric}
                onChange={(value) => patch("mainFabric", value)}
              />
            </Cell>
            <Cell label="Designer" className="col-span-4">
              {canReassignDesigner && !locked ? (
                <select
                  value={
                    designerOptions.some(
                      (item) => item.email === designerEmail,
                    )
                      ? designerEmail
                      : ""
                  }
                  onChange={(e) => {
                    const email = e.target.value;
                    const next = designerOptions.find(
                      (item) => item.email === email,
                    );
                    setDesignerEmail(email);
                    if (next) patch("designer", next.name);
                  }}
                  className={cn(sheetInput, "cursor-pointer")}
                >
                  {designerOptions.map((item) => (
                    <option key={item.email} value={item.email}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  disabled
                  value={personDisplayName(data.designer)}
                  className={sheetInput}
                />
              )}
            </Cell>

            <Cell label="Second fabric" className="col-span-3">
              <SheetLineInput
                disabled={locked}
                value={data.secondFabric}
                onChange={(value) => patch("secondFabric", value)}
              />
            </Cell>
            <Cell label="Division" className="col-span-3">
              <OptionGroup
                values={DIVISION_OPTIONS}
                selected={data.division}
                disabled={locked}
                onToggle={(value) =>
                  patch("division", toggleValue(data.division, value))
                }
              />
            </Cell>
            <Cell label="Country" className="col-span-2">
              <OptionGroup
                values={COUNTRY_OPTIONS}
                selected={data.country}
                disabled={locked}
                nowrap
                onToggle={(value) =>
                  patch("country", toggleValue(data.country, value))
                }
              />
            </Cell>
            <Cell label="Sample size" className="col-span-2">
              <SheetLineInput
                disabled={locked}
                value={data.sampleSize}
                onChange={(value) => patch("sampleSize", value)}
              />
            </Cell>
            <Cell
              label="Delivery"
              className="col-span-2 bg-[#e07a3d]/20"
            >
              <SheetLineInput
                disabled={locked}
                value={data.delivery}
                onChange={(value) => patch("delivery", value)}
                className="font-semibold"
              />
            </Cell>

            <Cell label="Washing process" className="col-span-7">
              <SheetLineInput
                disabled={locked}
                value={data.washProcess}
                onChange={(value) => patch("washProcess", value)}
              />
            </Cell>
            <Cell label="Brand type" className="col-span-3">
              <OptionGroup
                values={BRAND_TYPE_OPTIONS}
                selected={data.brandType}
                disabled={locked}
                onToggle={(value) =>
                  patch("brandType", toggleValue(data.brandType, value))
                }
              />
            </Cell>
            <Cell label="B.M." className="col-span-2">
              <SheetLineInput
                disabled={locked}
                value={data.brandManager}
                onChange={(value) => patch("brandManager", value)}
              />
            </Cell>

            <Cell label="Size break-down" className="col-span-9">
              <OptionGroup
                values={SIZE_BREAKDOWN_OPTIONS}
                selected={data.sizeBreakdown}
                disabled={locked}
                onToggle={(value) =>
                  patch("sizeBreakdown", toggleValue(data.sizeBreakdown, value))
                }
              />
            </Cell>
            <Cell label="Meeting date" className="col-span-3">
              <input
                type="month"
                disabled={locked}
                value={data.meetingDate.slice(0, 7)}
                onChange={(e) => patch("meetingDate", e.target.value)}
                className={sheetInput}
              />
            </Cell>
          </div>

          <div className="mt-0 border border-t-0 border-[#c8c8c8] bg-white">
            <p className="border-b border-[#c8c8c8] px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#6b6b6b]">
              Details
            </p>
            <ImageDropzone
              variant="sheet"
              label="Croquis / fotos"
              locked={locked}
              busy={busySlot === "details"}
              slot={images.details}
              className="min-h-64 border-0"
              onUpload={(files) => uploadSlot("details", files)}
              onRemove={() => removeSlot("details")}
            />
          </div>

          <div className="grid min-w-0 grid-cols-12">
            <div className="col-span-9">
              <Cell label="General comments" className="border-t-0">
                <textarea
                  disabled={locked}
                  value={data.generalComments}
                  onChange={(e) => patch("generalComments", e.target.value)}
                  rows={3}
                  className={cn(sheetInput, "min-h-16 resize-y break-words")}
                />
              </Cell>
              <Cell label="Accessories color" className="border-t-0">
                <SheetLineInput
                  disabled={locked}
                  value={data.accessoriesColor}
                  onChange={(value) => patch("accessoriesColor", value)}
                />
              </Cell>
              <div className="grid grid-cols-4 border border-t-0 border-[#c8c8c8] bg-white">
                {data.proformaColors.map((color, index) => (
                  <div
                    key={index}
                    className="min-h-24 min-w-0 overflow-hidden border-r border-[#c8c8c8] px-1.5 py-1 last:border-r-0"
                  >
                    {index === 0 ? (
                      <p className={sheetLabel}>Proforma colors code</p>
                    ) : (
                      <p className="h-[14px]" />
                    )}
                    <SheetLineInput
                      disabled={locked}
                      value={color}
                      placeholder={`Color ${index + 1}`}
                      onChange={(value) => {
                        const next = [...data.proformaColors];
                        next[index] = value;
                        patch("proformaColors", next);
                      }}
                    />
                    <ImageDropzone
                      variant="sheet"
                      label={`Swatch ${index + 1}`}
                      locked={locked}
                      busy={busySlot === (`swatch${index + 1}` as CoverImageKey)}
                      slot={
                        images[`swatch${index + 1}` as CoverImageKey]
                      }
                      className="mt-2 min-h-16 border-[#d0d0d0]"
                      onUpload={(files) =>
                        uploadSlot(
                          `swatch${index + 1}` as CoverImageKey,
                          files,
                        )
                      }
                      onRemove={() =>
                        removeSlot(`swatch${index + 1}` as CoverImageKey)
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-3 border border-t-0 border-l-0 border-[#c8c8c8] bg-white">
              <p className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-[#6b6b6b]">
                Respect hang tag
              </p>
              <ImageDropzone
                variant="sheet"
                label="Hang tag"
                locked={locked}
                busy={busySlot === "hangTag"}
                slot={images.hangTag}
                className="min-h-48 border-0"
                onUpload={(files) => uploadSlot("hangTag", files)}
                onRemove={() => removeSlot("hangTag")}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
