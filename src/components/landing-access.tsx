"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { XtyleSignInForm } from "@/components/xtyle-sign-in-form";

type LandingAccessProps = {
  bypassEnabled: boolean;
  isAuthenticated: boolean;
  destination: string;
};

export function LandingAccess({
  bypassEnabled,
  isAuthenticated,
  destination,
}: LandingAccessProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    router.replace(destination);
  }, [destination, isAuthenticated, router]);

  if (isAuthenticated) {
    return (
      <p className="text-sm text-muted-foreground">Entrando…</p>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/dev-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        destination?: string;
      } | null;

      if (!response.ok) {
        setError(payload?.error ?? "No fue posible ingresar.");
        return;
      }

      router.push(payload?.destination ?? "/dashboard");
      router.refresh();
    } catch {
      setError("No fue posible conectar con Xtyle.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
        >
          Ingresar al sistema
        </button>
      ) : (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="font-display text-lg text-foreground">Ingresar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {bypassEnabled
              ? "Modo bypass: ingresa con un correo autorizado."
              : "Te enviaremos un código por email."}
          </p>

          {bypassEnabled ? (
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <label className="block space-y-1.5 text-sm">
                <span className="text-muted-foreground">Correo</span>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground outline-none ring-ring focus:ring-2"
                />
              </label>
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {loading ? "Entrando…" : "Entrar"}
              </button>
            </form>
          ) : (
            <div className="mt-4">
              <XtyleSignInForm destination={destination} />
            </div>
          )}

          <button
            type="button"
            className="mt-3 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </button>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        ¿Problemas?{" "}
        <Link href="/sign-in" className="underline underline-offset-2">
          Ir a /sign-in
        </Link>
      </p>
    </div>
  );
}
