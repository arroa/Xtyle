"use client";

import { useEffect, useMemo, useState } from "react";

import { APP_ROLES, roleLabel, type AppRole } from "@/lib/roles";

type ListedUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: "ACTIVE" | "INACTIVE";
};

type UsersManagerProps = {
  initialUsers: ListedUser[];
  isSuperAdmin: boolean;
};

type ModalMode = "create" | "edit";

export function UsersManager({
  initialUsers,
  isSuperAdmin,
}: UsersManagerProps) {
  const [users, setUsers] = useState(initialUsers);
  const [mode, setMode] = useState<ModalMode | null>(null);
  const [editing, setEditing] = useState<ListedUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AppRole>(isSuperAdmin ? "ADMIN" : "EDITOR");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const roleOptions = useMemo(() => {
    if (isSuperAdmin) return [...APP_ROLES];
    return APP_ROLES.filter((r) => r !== "ADMIN");
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 3500);
    return () => window.clearTimeout(timer);
  }, [success]);

  useEffect(() => {
    if (!mode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  async function refresh() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as { users?: ListedUser[] };
    if (res.ok && data.users) setUsers(data.users);
  }

  function closeModal() {
    setMode(null);
    setEditing(null);
    setError("");
    setEmail("");
    setName("");
    setRole(isSuperAdmin ? "ADMIN" : "EDITOR");
    setStatus("ACTIVE");
  }

  function openCreate() {
    setEditing(null);
    setEmail("");
    setName("");
    setRole(isSuperAdmin ? "ADMIN" : "EDITOR");
    setStatus("ACTIVE");
    setError("");
    setSuccess("");
    setMode("create");
  }

  function openEdit(user: ListedUser) {
    if (!isSuperAdmin && user.role === "ADMIN") {
      setError("Solo el SuperAdmin puede editar Admins.");
      setSuccess("");
      return;
    }
    setEditing(user);
    setEmail(user.email);
    setName(user.name);
    setRole(user.role);
    setStatus(user.status);
    setError("");
    setSuccess("");
    setMode("edit");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "create") {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, role }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? "No se pudo crear.");
          return;
        }
        closeModal();
        setSuccess(`Usuario ${name || email} creado correctamente.`);
      } else {
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name, role, status }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? "No se pudo actualizar.");
          return;
        }
        closeModal();
        setSuccess(`Cambios guardados en ${name || email}.`);
      }

      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(user: ListedUser) {
    if (!isSuperAdmin && user.role === "ADMIN") {
      setError("Solo el SuperAdmin puede activar/desactivar Admins.");
      setSuccess("");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, status: next }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "No se pudo cambiar el estado.");
        setSuccess("");
        return;
      }
      setSuccess(
        next === "ACTIVE"
          ? `${user.name} reactivado.`
          : `${user.name} desactivado.`,
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const editRoleOptions =
    isSuperAdmin || editing?.role !== "ADMIN"
      ? roleOptions
      : (["ADMIN"] as AppRole[]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-foreground">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            ABM completo desde la app (alta, edición de perfil y baja lógica).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Nuevo usuario
        </button>
      </div>

      {success ? (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      ) : null}

      {error && !mode ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {mode ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-lg">
            <h2 className="font-display text-lg">
              {mode === "create" ? "Crear usuario" : "Editar usuario"}
            </h2>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Nombre</span>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Correo</span>
                <input
                  type="email"
                  required
                  value={email}
                  disabled={mode === "edit"}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 disabled:opacity-60"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Rol / perfil</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as AppRole)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2"
                >
                  {(mode === "edit" ? editRoleOptions : roleOptions).map(
                    (r) => (
                      <option key={r} value={r}>
                        {roleLabel(r)}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {mode === "edit" ? (
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Estado</span>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "ACTIVE" | "INACTIVE")
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="ACTIVE">Activo</option>
                    <option value="INACTIVE">Inactivo</option>
                  </select>
                </label>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                >
                  {busy
                    ? "Guardando…"
                    : mode === "create"
                      ? "Crear"
                      : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  Aún no hay usuarios.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">{roleLabel(user.role)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        user.status === "ACTIVE"
                          ? "text-emerald-400"
                          : "text-muted-foreground"
                      }
                    >
                      {user.status === "ACTIVE" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        disabled={busy || (!isSuperAdmin && user.role === "ADMIN")}
                        onClick={() => openEdit(user)}
                        className="text-xs underline-offset-2 hover:underline disabled:opacity-40"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={busy || (!isSuperAdmin && user.role === "ADMIN")}
                        onClick={() => void toggleStatus(user)}
                        className="text-xs underline-offset-2 hover:underline disabled:opacity-40"
                      >
                        {user.status === "ACTIVE" ? "Desactivar" : "Reactivar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
