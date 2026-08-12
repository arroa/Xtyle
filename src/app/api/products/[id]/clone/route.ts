import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireUser } from "@/lib/api-auth";
import { canEditProducts, cloneProduct } from "@/lib/products";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canEditProducts(auth.user.role, auth.user.isSuperAdmin)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const product = await cloneProduct(id, auth.user.email);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      product: {
        id:
          product._id instanceof ObjectId
            ? product._id.toString()
            : String(product._id),
        brand: product.brand,
        style: product.style,
        shortDescription: product.shortDescription,
        status: product.status,
      },
    },
    { status: 201 },
  );
}
