import "server-only";

import { isDevBypassEnabled } from "@/lib/dev-flags";
import { getDevSessionUserId } from "@/lib/dev-session";
import type { AppRole } from "@/lib/roles";
import { findUserByEmail } from "@/lib/users";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  role: AppRole | "SUPER_ADMIN" | null;
  canManageUsers: boolean;
};

export function getSuperAdminEmail(): string {
  return (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  let id: string | null = null;
  let email: string | null = null;
  let name = "";

  if (isDevBypassEnabled()) {
    const userId = await getDevSessionUserId();
    if (!userId?.startsWith("dev:")) {
      return null;
    }
    id = userId;
    email = userId.slice(4).toLowerCase();
    name = email;
  } else {
    const { currentUser } = await import("@clerk/nextjs/server");
    const clerkUser = await currentUser();
    email =
      clerkUser?.primaryEmailAddress?.emailAddress.toLowerCase() ?? null;
    if (!clerkUser || !email) {
      return null;
    }
    id = clerkUser.id;
    name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      email;
  }

  const superAdminEmail = getSuperAdminEmail();
  const isSuperAdmin = Boolean(superAdminEmail) && email === superAdminEmail;

  if (isSuperAdmin) {
    return {
      id,
      email,
      name: name || email,
      isSuperAdmin: true,
      role: "SUPER_ADMIN",
      canManageUsers: true,
    };
  }

  const appUser = await findUserByEmail(email);
  if (!appUser || appUser.status !== "ACTIVE") {
    return null;
  }

  return {
    id,
    email,
    name: appUser.name || name || email,
    isSuperAdmin: false,
    role: appUser.role,
    canManageUsers: appUser.role === "ADMIN",
  };
}
