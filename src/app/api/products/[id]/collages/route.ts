import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { requireUser } from "@/lib/api-auth";
import { addCollage, canEditProducts } from "@/lib/products";

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
  const product = await addCollage(id, {
    updatedByEmail: auth.user.email,
  });

  if (!product) {
    return NextResponse.json(
      { error: "No se pudo crear el collage (¿borrador inexistente?)." },
      { status: 400 },
    );
  }

  const created = product.collages[product.collages.length - 1];

  return NextResponse.json(
    {
      ok: true,
      collage: created,
      productId:
        product._id instanceof ObjectId
          ? product._id.toString()
          : String(product._id),
    },
    { status: 201 },
  );
}
