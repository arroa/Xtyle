import "server-only";

import type { Collection } from "mongodb";

import { ensureClerkUser, normalizeEmail } from "@/lib/clerk-users";
import { getDb } from "@/lib/mongodb";
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

export async function hasAssignedAccess(email: string): Promise<boolean> {
  const user = await findUserByEmail(email);
  return Boolean(user && user.status === "ACTIVE");
}

export async function listUsers(): Promise<AppUser[]> {
  const col = await usersCollection();
  return col.find({}).sort({ createdAt: -1 }).toArray();
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
