import Link from "next/link";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { canEditProducts } from "@/lib/products";
import { roleLabel } from "@/lib/roles";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const canEdit = canEditProducts(user.role, user.isSuperAdmin);

  return (
    <div className="min-h-full">
      <AppHeader
        email={user.email}
        name={user.name}
        role={user.role}
        canManageUsers={user.canManageUsers}
        bypassEnabled={isDevBypassEnabled()}
      />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-display text-3xl text-foreground">
          Hola, {user.name}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Rol: {user.role ? roleLabel(user.role) : "—"}.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/products"
            className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
          >
            <p className="text-sm text-muted-foreground">Catálogo</p>
            <p className="mt-1 font-medium">Ver productos / fichas</p>
          </Link>
          {canEdit ? (
            <Link
              href="/products/new"
              className="rounded-xl border border-border bg-card p-5 transition hover:border-primary/40"
            >
              <p className="text-sm text-muted-foreground">Alta</p>
              <p className="mt-1 font-medium">Nuevo producto (plantilla base)</p>
            </Link>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm text-muted-foreground">Consulta</p>
              <p className="mt-1 font-medium">Solo lectura en productos</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
