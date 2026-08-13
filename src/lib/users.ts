import "server-only";

import type { Collection } from "mongodb";

import { ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { getDb } from "@/lib/mongodb";
import { personDisplayName } from "@/lib/person-name";
import {
  type AppRole,
  type AppUser,
  type UserStatus,
} from "@/lib/roles";

const COLLECTION = "users";

async function usersCollection(): Promise<Collection<AppUser>> {
  const db = await getDb();
  return db.collection<AppUser>(COLLECTION);
}

export async function ensureUsersIndexes() {
  const col = await usersCollection();
  await col.createIndex({ email: 1 }, { unique: true });
  await col.createIndex({ clerkUserId: 1 });
  await col.createIndex({ status: 1, role: 1 });
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const col = await usersCollection();
  return col.findOne({ email: normalizeEmail(email) });
}

export async function resolveDesignerName(input: {
  designer?: string;
  createdByEmail?: string;
}): Promise<string> {
  const fromField = personDisplayName(input.designer);
  if (fromField) return fromField;
  if (!input.createdByEmail) return "";
  const owner = await findUserByEmail(input.createdByEmail);
  return personDisplayName(owner?.name);
}

export async function resolveActorDisplayName(input: {
  name: string;
  email: string;
}): Promise<string> {
  const fromSession = personDisplayName(input.name);
  if (fromSession) return fromSession;
  const appUser = await findUserByEmail(input.email);
  return personDisplayName(appUser?.name);
}

export async function listNamesByEmails(
  emails: string[],
): Promise<Map<string, string>> {
  const unique = [
    ...new Set(
      emails.map((email) => email.trim().toLowerCase()).filter(Boolean),
    ),
  ];
  const map = new Map<string, string>();
  if (!unique.length) return map;

  const col = await usersCollection();
  const users = await col.find({ email: { $in: unique } }).toArray();
  for (const user of users) {
    const name = personDisplayName(user.name);
    if (name) map.set(user.email.toLowerCase(), name);
  }
  return map;
}

export async function resolveDesignerNames(
  items: Array<{ designer?: string; createdByEmail?: string }>,
): Promise<string[]> {
  const names = await listNamesByEmails(
    items.map((item) => item.createdByEmail ?? ""),
  );
  return items.map(
    (item) =>
      personDisplayName(item.designer) ||
      names.get((item.createdByEmail ?? "").trim().toLowerCase()) ||
      "",
  );
}

export async function hasAssignedAccess(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return Boolean(user && user.status === "ACTIVE");
}

export async function listUsers(): Promise<AppUser[]> {
  const col = await usersCollection();
  return col.find({}).sort({ createdAt: -1 }).toArray();
}

/** Admins y Editors activos: candidatos a Designer / dueño de ficha. */
export async function listAssignableDesigners(): Promise<
  Array<{ name: string; email: string }>
> {
  const col = await usersCollection();
  const users = await col
    .find({
      status: "ACTIVE",
      role: { $in: ["ADMIN", "EDITOR"] },
    })
    .sort({ name: 1 })
    .toArray();
  return users
    .map((user) => ({
      name: personDisplayName(user.name),
      email: user.email,
    }))
    .filter((user) => user.name);
}

export async function createAppUser(input: {
  email: string;
  name: string;
  role: AppRole;
  createdByEmail: string;
}): Promise<AppUser> {
  const email = normalizeEmail(input.email);
  const col = await usersCollection();
  const existing = await col.findOne({ email });
  if (existing) {
    throw new Error("Ya existe un usuario con ese correo.");
  }

  // Alta de app: siempre provisionar en Clerk (el bypass solo afecta el login OTP).
  const clerkUserId = await ensureClerkUser(email, { forceClerk: true });
  const now = new Date();
  const doc: AppUser = {
    email,
    clerkUserId,
    name: input.name.trim() || email,
    role: input.role,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
    createdByEmail: normalizeEmail(input.createdByEmail),
  };

  await col.insertOne(doc);
  return doc;
}

/** Repara usuarios creados en bypass con id `dev:` y los crea en Clerk. */
export async function syncUserToClerk(email: string): Promise<AppUser | null> {
  const col = await usersCollection();
  const user = await col.findOne({ email: normalizeEmail(email) });
  if (!user) return null;

  const clerkUserId = await ensureClerkUser(user.email, { forceClerk: true });
  if (user.clerkUserId === clerkUserId) {
    return user;
  }

  const result = await col.findOneAndUpdate(
    { email: user.email },
    { $set: { clerkUserId, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function updateAppUser(
  email: string,
  patch: Partial<Pick<AppUser, "name" | "role" | "status">>,
): Promise<AppUser | null> {
  const col = await usersCollection();
  const result = await col.findOneAndUpdate(
    { email: normalizeEmail(email) },
    {
      $set: {
        ...patch,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function deactivateAppUser(email: string): Promise<AppUser | null> {
  return updateAppUser(email, { status: "INACTIVE" as UserStatus });
}

export function getPostLoginPath(options: {
  isSuperAdmin: boolean;
  role?: AppRole | null;
}): string {
  if (options.isSuperAdmin || options.role === "ADMIN") {
    return "/dashboard";
  }
  return "/dashboard";
}
