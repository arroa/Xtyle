import type { ObjectId } from "mongodb";

export const APP_ROLES = ["ADMIN", "EDITOR", "VIEWER"] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type UserStatus = "ACTIVE" | "INACTIVE";

export type AppUser = {
  _id?: ObjectId;
  email: string;
  clerkUserId: string;
  name: string;
  role: AppRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  createdByEmail: string;
};

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}

export function roleLabel(role: AppRole | "SUPER_ADMIN"): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "SuperAdmin";
    case "ADMIN":
      return "Admin";
    case "EDITOR":
      return "Editor";
    case "VIEWER":
      return "Viewer";
  }
}
