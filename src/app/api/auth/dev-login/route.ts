import { NextResponse } from "next/server";
import { z } from "zod";

import { isDevBypassEnabled } from "@/lib/dev-flags";
import {
  createDevSessionToken,
  devSessionCookieOptions,
} from "@/lib/dev-session";
import { getSuperAdminEmail } from "@/lib/current-user";
import { findUserByEmail, getPostLoginPath, hasAssignedAccess } from "@/lib/users";

const bodySchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  if (!isDevBypassEnabled()) {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const isSuperAdmin = email === getSuperAdminEmail();
  const isAuthorized = isSuperAdmin || (await hasAssignedAccess(email));

  if (!isAuthorized) {
    return NextResponse.json(
      { error: "Este correo no tiene acceso." },
      { status: 403 },
    );
  }

  const appUser = isSuperAdmin ? null : await findUserByEmail(email);
  const userId = `dev:${email}`;
  const token = await createDevSessionToken(userId);
  const destination = getPostLoginPath({
    isSuperAdmin,
    role: appUser?.role ?? null,
  });

  const response = NextResponse.json({ ok: true, userId, destination });
  const cookie = devSessionCookieOptions(token);
  response.cookies.set(cookie.name, cookie.value, cookie);
  return response;
}
