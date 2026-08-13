import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import { canCreateOrCloneProducts } from "@/lib/product-access";
import {
  createProduct,
  listProducts,
} from "@/lib/products";
import { resolveActorDisplayName, resolveDesignerNames } from "@/lib/users";

const createSchema = z.object({
  brand: z.string().min(1).max(120),
  retailer: z.string().min(1).max(120),
  season: z.string().min(1).max(80),
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

  const designerNames = await resolveDesignerNames(
    products.map((product) => ({
      designer: product.cover.data.designer,
      createdByEmail: product.createdByEmail,
    })),
  );

  return NextResponse.json({
    products: products.map((product, index) => ({
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
      version: product.version,
      updatedAt: product.updatedAt,
      createdAt: product.createdAt,
      createdByEmail: product.createdByEmail,
      designerName: designerNames[index] ?? "",
    })),
  });
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  if (!canCreateOrCloneProducts(auth.user)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const product = await createProduct({
    ...parsed.data,
    createdByEmail: auth.user.email,
    designerName: await resolveActorDisplayName(auth.user),
  });

  return NextResponse.json(
    {
      ok: true,
      product: {
        id: product._id!.toString(),
        brand: product.brand,
        retailer: product.retailer,
        season: product.season,
        style: product.style,
        shortDescription: product.shortDescription,
        status: product.status,
        version: product.version,
      },
    },
    { status: 201 },
  );
}
