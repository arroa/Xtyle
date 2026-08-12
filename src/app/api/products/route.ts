import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import {
  canEditProducts,
  createProduct,
  listProducts,
} from "@/lib/products";

const createSchema = z.object({
  brand: z.string().min(1).max(120),
  style: z.string().min(1).max(120),
  shortDescription: z.string().min(1).max(200),
});

export async function GET(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const products = await listProducts({
    q: searchParams.get("q") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  return NextResponse.json({
    products: products.map((product) => ({
      id:
        product._id instanceof ObjectId
          ? product._id.toString()
          : String(product._id),
      brand: product.brand || product.cover?.data?.brand || "",
      style: product.style,
      shortDescription: product.shortDescription,
      status: product.status,
      version: product.version,
      updatedAt: product.updatedAt,
      createdAt: product.createdAt,
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canEditProducts(auth.user.role, auth.user.isSuperAdmin)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const product = await createProduct({
    brand: parsed.data.brand,
    style: parsed.data.style,
    shortDescription: parsed.data.shortDescription,
    createdByEmail: auth.user.email,
  });

  return NextResponse.json(
    {
      ok: true,
      product: {
        id: product._id!.toString(),
        brand: product.brand,
        style: product.style,
        shortDescription: product.shortDescription,
        status: product.status,
        version: product.version,
      },
    },
    { status: 201 },
  );
}
