import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import { PAGE_KINDS } from "@/lib/product-types";
import { requireProductMutation } from "@/lib/require-product-write";
import {
  addProductPage,
  reorderProductPages,
} from "@/lib/products";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const createPageSchema = z.object({
  kind: z.enum(PAGE_KINDS),
  title: z.string().max(120).optional(),
});

const reorderSchema = z.object({
  pageIds: z.array(z.string().min(1)).min(1),
});

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const json = await request.json().catch(() => null);
  const parsed = createPageSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const product = await addProductPage(id, {
    kind: parsed.data.kind,
    title: parsed.data.title,
    updatedByEmail: auth.user.email,
  });

  if (!product) {
    return NextResponse.json(
      { error: "No se pudo crear la página (¿falta título o no es borrador?)." },
      { status: 400 },
    );
  }

  const created = product.pages[product.pages.length - 1];

  return NextResponse.json(
    {
      ok: true,
      page: created,
      productId:
        product._id instanceof ObjectId
          ? product._id.toString()
          : String(product._id),
    },
    { status: 201 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const json = await request.json().catch(() => null);
  const parsed = reorderSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const product = await reorderProductPages(
    id,
    parsed.data.pageIds,
    auth.user.email,
  );

  if (!product) {
    return NextResponse.json(
      { error: "No se pudo reordenar (¿orden incompleto o no es borrador?)." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, pages: product.pages });
}
