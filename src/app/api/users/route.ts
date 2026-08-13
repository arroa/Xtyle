import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireUserManager } from "@/lib/api-auth";
import { formatClerkError } from "@/lib/clerk-users";
import { getSuperAdminEmail } from "@/lib/current-user";
import { APP_ROLES, isAppRole } from "@/lib/roles";
import {
  createAppUser,
  deactivateAppUser,
  findUserByEmail,
  listUsers,
  updateAppUser,
} from "@/lib/users";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120),
  role: z.enum(APP_ROLES),
});

const patchSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(120).optional(),
  role: z.enum(APP_ROLES).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function GET() {
  const auth = await requireUserManager();
  if ("error" in auth) return auth.error;

  const users = await listUsers();
  return NextResponse.json({
    users: users.map((user) => ({
      id: user._id instanceof ObjectId ? user._id.toString() : String(user._id),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUserManager();
  if ("error" in auth) return auth.error;

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (email === getSuperAdminEmail()) {
    return NextResponse.json(
      { error: "Ese correo es el SuperAdmin de plataforma." },
      { status: 400 },
    );
  }

  // Solo SuperAdmin crea Admins; Admin crea Editor/Viewer
  if (parsed.data.role === "ADMIN" && !auth.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Solo el SuperAdmin puede crear Admins." },
      { status: 403 },
    );
  }

  if (!auth.user.isSuperAdmin && parsed.data.role === "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    const user = await createAppUser({
      email,
      name: parsed.data.name,
      role: parsed.data.role,
      createdByEmail: auth.user.email,
    });
    return NextResponse.json({ ok: true, user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: formatClerkError(error) },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const auth = await requireUserManager();
  if ("error" in auth) return auth.error;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (parsed.data.role && !isAppRole(parsed.data.role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  if (parsed.data.role === "ADMIN" && !auth.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Solo el SuperAdmin puede asignar Admin." },
      { status: 403 },
    );
  }

  const target = await findUserByEmail(parsed.data.email);
  if (!target) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (!auth.user.isSuperAdmin && target.role === "ADMIN") {
    return NextResponse.json(
      { error: "Solo el SuperAdmin puede modificar Admins." },
      { status: 403 },
    );
  }

  const updated = await updateAppUser(parsed.data.email, {
    name: parsed.data.name,
    role: parsed.data.role,
    status: parsed.data.status,
  });

  if (!updated) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: updated });
}

export async function DELETE(request: Request) {
  const auth = await requireUserManager();
  if ("error" in auth) return auth.error;

  const json = await request.json().catch(() => null);
  const email =
    typeof json?.email === "string" ? json.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "Correo requerido" }, { status: 400 });
  }

  const updated = await deactivateAppUser(email);
  if (!updated) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, user: updated });
}
