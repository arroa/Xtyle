"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type AppNavMenuProps = {
  email: string;
  name: string;
  roleLabel: string;
  canManageUsers: boolean;
  bypassEnabled: boolean;
};

function HamburgerIcon() {
  return (
    <span className="relative block size-5" aria-hidden>
      <span className="absolute left-0 top-[3px] h-0.5 w-5 rounded-full bg-current" />
      <span className="absolute left-0 top-[9px] h-0.5 w-5 rounded-full bg-current" />
      <span className="absolute left-0 top-[15px] h-0.5 w-5 rounded-full bg-current" />
    </span>
  );
}

function NavShell({
  email,
  name,
  roleLabel,
  canManageUsers,
  leaving,
  onSignOut,
}: {
  email: string;
  name: string;
  roleLabel: string;
  canManageUsers: boolean;
  leaving: boolean;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node | null;
      if (rootRef.current && target && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const links = [
    { href: "/dashboard", label: "Inicio" },
    { href: "/products", label: "Productos" },
    ...(canManageUsers ? [{ href: "/users", label: "Usuarios" }] : []),
  ];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="Abrir menú"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-muted"
      >
        <HamburgerIcon />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <p className="mt-1 text-xs text-primary">{roleLabel}</p>
          </div>

          <nav className="flex flex-col gap-0.5 p-2">
            {links.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  role="menuitem"
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/15 font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-border p-2">
            <button
              type="button"
              role="menuitem"
              disabled={leaving}
              onClick={onSignOut}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-60"
            >
              {leaving ? "Saliendo…" : "Salir"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BypassNavMenu(props: Omit<AppNavMenuProps, "bypassEnabled">) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleSignOut() {
    setLeaving(true);
    try {
      await fetch("/api/auth/dev-logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <NavShell {...props} leaving={leaving} onSignOut={() => void handleSignOut()} />
  );
}

function ClerkNavMenu(props: Omit<AppNavMenuProps, "bypassEnabled">) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const [leaving, setLeaving] = useState(false);

  async function handleSignOut() {
    setLeaving(true);
    try {
      await fetch("/api/auth/dev-logout", { method: "POST" });
      if (isSignedIn) {
        await signOut({ redirectUrl: "/" });
        return;
      }
      router.push("/");
      router.refresh();
    } finally {
      setLeaving(false);
    }
  }

  return (
    <NavShell {...props} leaving={leaving} onSignOut={() => void handleSignOut()} />
  );
}

export function AppNavMenu({ bypassEnabled, ...rest }: AppNavMenuProps) {
  if (bypassEnabled) {
    return <BypassNavMenu {...rest} />;
  }
  return <ClerkNavMenu {...rest} />;
}
