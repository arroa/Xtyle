import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled } from "@/lib/dev-flags";
import { roleLabel } from "@/lib/roles";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

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
          Rol: {user.role ? roleLabel(user.role) : "—"}. El catálogo de fichas
          viene en el siguiente bloque.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Estado del esqueleto</p>
            <p className="mt-1 font-medium">Auth + usuarios listos</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Siguiente</p>
            <p className="mt-1 font-medium">Alta / clonar ficha borrador</p>
          </div>
        </div>
      </main>
    </div>
  );
}
