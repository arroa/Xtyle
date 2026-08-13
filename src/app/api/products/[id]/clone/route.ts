import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireUser } from "@/lib/api-auth";
import { canCreateOrCloneProducts } from "@/lib/product-access";
import { cloneProduct } from "@/lib/products";
import { resolveActorDisplayName } from "@/lib/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canCreateOrCloneProducts(auth.user)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const { id } = await context.params;
  const product = await cloneProduct(
    id,
    auth.user.email,
    await resolveActorDisplayName(auth.user),
  );
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
        retailer: product.retailer,
        season: product.season,
        style: product.style,
        shortDescription: product.shortDescription,
        status: product.status,
      },
    },
    { status: 201 },
  );
}
