import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import { requireProductMutation } from "@/lib/require-product-write";
import {
  removeProductPage,
  updateProductPage,
} from "@/lib/products";

type RouteContext = {
  params: Promise<{ id: string; pageId: string }>;
};

const patchSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id, pageId } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const product = await updateProductPage(id, pageId, {
    title: parsed.data.title,
    updatedByEmail: auth.user.email,
  });

  if (!product) {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    page: product.pages.find((page) => page.id === pageId) ?? null,
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id, pageId } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const product = await removeProductPage(id, pageId, auth.user.email);
  if (!product) {
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, pages: product.pages });
}
