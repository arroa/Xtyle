"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductCreateForm() {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [style, setStyle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, style, shortDescription }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        product?: { id: string };
      } | null;
      if (!res.ok || !data?.product) {
        setError(data?.error ?? "No se pudo crear el producto.");
        return;
      }
      router.push(`/products/${data.product.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-lg space-y-4 rounded-xl border border-border bg-card p-6"
    >
      <div>
        <h1 className="font-display text-2xl">Nuevo producto</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Alta mínima: Marca, Style y Short Description. Queda en Borrador con
          la plantilla base.
        </p>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Marca</span>
        <input
          required
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Regatta"
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Style</span>
        <input
          required
          value={style}
          onChange={(e) => setStyle(e.target.value)}
          placeholder="BLU ML BARBARA RGT COR I27"
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="block space-y-1 text-sm">
        <span className="text-muted-foreground">Short Description</span>
        <input
          required
          value={shortDescription}
          onChange={(e) => setShortDescription(e.target.value)}
          placeholder="BARBARA"
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={() => router.push("/products")}
          className="rounded-md border border-border px-3 py-2 text-sm"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {busy ? "Creando…" : "Crear borrador"}
        </button>
      </div>
    </form>
  );
}
