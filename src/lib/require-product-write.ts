import { NextResponse } from "next/server";

import {
  canMutateProduct,
  type AccessActor,
} from "@/lib/product-access";
import { getProductById } from "@/lib/products";

export async function requireProductMutation(actor: AccessActor, id: string) {
  const product = await getProductById(id);
  if (!product) {
    return {
      error: NextResponse.json(
        { error: "Producto no encontrado" },
        { status: 404 },
      ),
    } as const;
  }
  if (!canMutateProduct(actor, product)) {
    return {
      error: NextResponse.json({ error: "No autorizado." }, { status: 403 }),
    } as const;
  }
  return { product } as const;
}
