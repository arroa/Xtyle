import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireUser } from "@/lib/api-auth";
import { requireProductMutation } from "@/lib/require-product-write";
import { releaseProduct } from "@/lib/products";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const product = await releaseProduct(id, auth.user.email);
  if (!product) {
    return NextResponse.json(
      { error: "No se pudo marcar como Definitiva (¿ya lo está o no existe?)." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    ok: true,
    product: {
      id:
        product._id instanceof ObjectId
          ? product._id.toString()
          : String(product._id),
      status: product.status,
      version: product.version,
    },
  });
}
