"use client";

import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { useState } from "react";

type Step = "email" | "code";

function normalizeIdentifier(email: string) {
  return email.trim().toLowerCase();
}

export function XtyleSignInForm({ destination }: { destination: string }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn, signOut } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isLoaded || !signIn) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  async function finishSignIn(sessionId: string) {
    setLoading(true);
    await setActive({ session: sessionId });
    window.location.assign(destination);
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignedIn) {
        await signOut();
      }

      const result = await signIn.create({
        identifier: normalizeIdentifier(email),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await finishSignIn(result.createdSessionId);
        return;
      }

      const emailFactor = result.supportedFirstFactors?.find(
        (factor) => factor.strategy === "email_code",
      );

      if (!emailFactor || !("emailAddressId" in emailFactor)) {
        setError(
          "Activa Email verification code en Clerk (Dashboard → Auth).",
        );
        return;
      }

      await signIn.prepareFirstFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
      setStep("code");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Error");
      } else {
        setError("No se pudo iniciar sesión.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "email_code",
        code: code.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await finishSignIn(result.createdSessionId);
        return;
      }

      setError("Código incompleto. Intenta de nuevo.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(err.errors[0]?.longMessage ?? err.errors[0]?.message ?? "Error");
      } else {
        setError("Código inválido.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (step === "code") {
    return (
      <form className="space-y-3" onSubmit={handleCodeSubmit}>
        <p className="text-sm text-muted-foreground">
          Código enviado a <span className="text-foreground">{email}</span>
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
          placeholder="123456"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Verificando…" : "Verificar código"}
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleEmailSubmit}>
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Correo</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
      >
        {loading ? "Enviando…" : "Enviar código"}
      </button>
    </form>
  );
}
