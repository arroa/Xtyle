import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import {
  canEditProducts,
  removeCollage,
  updateCollage,
} from "@/lib/products";

type RouteContext = {
  params: Promise<{ id: string; collageId: string }>;
};

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canEditProducts(auth.user.role, auth.user.isSuperAdmin)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id, collageId } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const product = await updateCollage(id, collageId, {
    title: parsed.data.title,
    updatedByEmail: auth.user.email,
  });

  if (!product) {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    collage: product.collages.find((c) => c.id === collageId) ?? null,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canEditProducts(auth.user.role, auth.user.isSuperAdmin)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id, collageId } = await context.params;
  const product = await removeCollage(id, collageId, auth.user.email);
  if (!product) {
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, collages: product.collages });
}
