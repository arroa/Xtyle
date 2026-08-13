"use client";

import { useAuth } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignIn } from "@clerk/nextjs/legacy";
import type { SignInResource } from "@clerk/shared/types";
import { useEffect, useState } from "react";

type Step = "email" | "code";

type SetActiveFn = (params: {
  session: string | null;
  redirectUrl?: string;
  navigate?: (opts: {
    decorateUrl: (url: string) => string;
  }) => void | Promise<void>;
}) => Promise<void>;

function normalizeIdentifier(email: string) {
  return email.trim().toLowerCase();
}

function goToDestination(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    window.location.href = url;
    return;
  }
  window.location.assign(url);
}

function ClerkSignInFormInner({
  signIn,
  setActive,
  destination,
}: {
  signIn: SignInResource;
  setActive: SetActiveFn;
  destination: string;
}) {
  const { isSignedIn, signOut } = useAuth();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function finishSignIn(sessionId: string) {
    setLoading(true);
    let navigated = false;
    await setActive({
      session: sessionId,
      redirectUrl: destination,
      navigate: async ({ decorateUrl }) => {
        navigated = true;
        goToDestination(decorateUrl(destination));
      },
    });
    if (!navigated) {
      goToDestination(destination);
    }
  }

  async function clearClerkState() {
    if (isSignedIn || signIn.status) {
      await signOut();
    }
  }

  async function startSignIn(
    identifier: string,
    retry = false,
  ): Promise<SignInResource> {
    const normalized = normalizeIdentifier(identifier);

    if (
      signIn.status === "needs_first_factor" &&
      signIn.identifier?.toLowerCase() === normalized
    ) {
      return signIn;
    }

    if (!retry && (isSignedIn || signIn.status)) {
      await clearClerkState();
    }

    try {
      return await signIn.create({ identifier: normalized });
    } catch (err) {
      if (!retry && isClerkAPIResponseError(err)) {
        const clerkCode = err.errors[0]?.code;
        if (clerkCode === "session_exists" || err.status === 409) {
          await clearClerkState();
          return startSignIn(identifier, true);
        }
      }
      throw err;
    }
  }

  async function prepareEmailCode(result: SignInResource) {
    if (result.status === "complete" && result.createdSessionId) {
      await finishSignIn(result.createdSessionId);
      return;
    }

    if (result.status !== "needs_first_factor") {
      setError("No se pudo iniciar sesión. Intenta de nuevo.");
      return;
    }

    const emailFactor = result.supportedFirstFactors?.find(
      (factor) => factor.strategy === "email_code",
    );

    if (!emailFactor || !("emailAddressId" in emailFactor)) {
      const hasPassword = result.supportedFirstFactors?.some(
        (factor) => factor.strategy === "password",
      );
      setError(
        hasPassword
          ? "Clerk tiene solo contraseña activa. En el dashboard activa Email verification code."
          : "El código por correo no está habilitado en Clerk.",
      );
      return;
    }

    await signIn.prepareFirstFactor({
      strategy: "email_code",
      emailAddressId: emailFactor.emailAddressId,
    });

    setStep("code");
  }

  async function handleEmailSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await startSignIn(email);
      await prepareEmailCode(result);
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(
          err.errors[0]?.longMessage ??
            err.errors[0]?.message ??
            "No se pudo iniciar sesión.",
        );
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

      setError("Código inválido o expirado.");
    } catch (err) {
      if (isClerkAPIResponseError(err)) {
        setError(
          err.errors[0]?.longMessage ??
            err.errors[0]?.message ??
            "Código inválido.",
        );
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
          id="xtyle-access-code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={6}
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-center text-2xl tracking-[0.35em] outline-none ring-ring focus:ring-2"
          placeholder="000000"
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || code.length < 6}
          className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading ? "Verificando…" : "Verificar código"}
        </button>
        <button
          type="button"
          className="w-full text-xs text-muted-foreground hover:text-foreground"
          onClick={() => {
            setStep("email");
            setCode("");
            setError("");
            void clearClerkState();
          }}
        >
          Usar otro correo
        </button>
      </form>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleEmailSubmit}>
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Correo</span>
        <input
          id="xtyle-access-email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 outline-none ring-ring focus:ring-2"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
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

function ClerkSignInForm({ destination }: { destination: string }) {
  const { signIn, isLoaded, setActive } = useSignIn();

  if (!isLoaded || !signIn || !setActive) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return (
    <ClerkSignInFormInner
      signIn={signIn}
      setActive={setActive}
      destination={destination}
    />
  );
}

export function XtyleSignInForm({ destination }: { destination: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <p className="text-sm text-muted-foreground">Cargando…</p>;
  }

  return <ClerkSignInForm destination={destination} />;
}
