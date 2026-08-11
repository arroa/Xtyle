import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { UsersManager } from "@/components/users-manager";
import { getCurrentUser } from "@/lib/current-user";
import { isDevBypassEnabled, isDevClerkUserId } from "@/lib/dev-flags";
import type { AppRole } from "@/lib/roles";
import { listUsers, syncUserToClerk } from "@/lib/users";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!user.canManageUsers) redirect("/dashboard");

  const rawUsers = await listUsers();

  // Repara altas hechas antes (ids `dev:`) sincronizándolas a Clerk.
  for (const item of rawUsers) {
    if (isDevClerkUserId(item.clerkUserId)) {
      try {
        await syncUserToClerk(item.email);
      } catch {
        // Si Clerk falla, se listan igual; el próximo alta mostrará el error.
      }
    }
  }

  const users = await listUsers();

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
        <UsersManager
          isSuperAdmin={user.isSuperAdmin}
          initialUsers={users.map((item) => ({
            id:
              item._id instanceof ObjectId
                ? item._id.toString()
                : String(item._id ?? item.email),
            email: item.email,
            name: item.name,
            role: item.role as AppRole,
            status: item.status,
          }))}
        />
      </main>
    </div>
  );
}
