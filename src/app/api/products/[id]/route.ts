import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import {
  canEditProducts,
  getProductById,
  updateProductBasics,
} from "@/lib/products";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  brand: z.string().min(1).max(120).optional(),
  style: z.string().min(1).max(120).optional(),
  shortDescription: z.string().min(1).max(200).optional(),
});

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    product: {
      ...product,
      id:
        product._id instanceof ObjectId
          ? product._id.toString()
          : String(product._id),
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canEditProducts(auth.user.role, auth.user.isSuperAdmin)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const updated = await updateProductBasics(id, {
    ...parsed.data,
    updatedByEmail: auth.user.email,
  });

  if (!updated) {
    return NextResponse.json(
      { error: "No se pudo actualizar (¿es Definitiva o no existe?)." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    product: {
      id:
        updated._id instanceof ObjectId
          ? updated._id.toString()
          : String(updated._id),
      brand: updated.brand,
      style: updated.style,
      shortDescription: updated.shortDescription,
      status: updated.status,
    },
  });
}
