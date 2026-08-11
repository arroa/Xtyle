import Link from "next/link";

import { AppNavMenu } from "@/components/app-nav-menu";
import { XtyleAvatar } from "@/components/xtyle-avatar";
import { roleLabel, type AppRole } from "@/lib/roles";

type AppHeaderProps = {
  email: string;
  name: string;
  role: AppRole | "SUPER_ADMIN" | null;
  canManageUsers: boolean;
  bypassEnabled: boolean;
};

export function AppHeader({
  email,
  name,
  role,
  canManageUsers,
  bypassEnabled,
}: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <XtyleAvatar sizeClassName="size-8" />
          <span className="font-display text-lg tracking-tight text-foreground">
            Xtyle
          </span>
        </Link>

        <AppNavMenu
          email={email}
          name={name}
          roleLabel={role ? roleLabel(role) : "—"}
          canManageUsers={canManageUsers}
          bypassEnabled={bypassEnabled}
        />
      </div>
    </header>
  );
}
