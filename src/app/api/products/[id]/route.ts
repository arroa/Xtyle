import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import {
  canReassignDesigner,
} from "@/lib/product-access";
import { requireProductMutation } from "@/lib/require-product-write";
import {
  deleteProduct,
  getProductById,
  updateProductBasics,
  updateProductCover,
} from "@/lib/products";
import { listAssignableDesigners } from "@/lib/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const patchSchema = z.object({
  brand: z.string().min(1).max(120).optional(),
  retailer: z.string().min(1).max(120).optional(),
  season: z.string().min(1).max(80).optional(),
  style: z.string().min(1).max(120).optional(),
  shortDescription: z.string().min(1).max(200).optional(),
  cover: z
    .object({
      evento: z.string().max(120).optional(),
      packing: z.array(z.string().max(40)).optional(),
      fabricType: z.array(z.string().max(40)).optional(),
      exhibition: z.array(z.string().max(40)).optional(),
      mainFabric: z.string().max(240).optional(),
      secondFabric: z.string().max(240).optional(),
      designer: z.string().max(160).optional(),
      division: z.array(z.string().max(80)).optional(),
      country: z.array(z.string().max(80)).optional(),
      sampleSize: z.string().max(40).optional(),
      delivery: z.string().max(80).optional(),
      washProcess: z.string().max(240).optional(),
      brandType: z.array(z.string().max(80)).optional(),
      brandManager: z.string().max(160).optional(),
      sizeBreakdown: z.array(z.string().max(40)).optional(),
      meetingDate: z.string().max(40).optional(),
      generalComments: z.string().max(2000).optional(),
      accessoriesColor: z.string().max(240).optional(),
      proformaColors: z.array(z.string().max(80)).max(4).optional(),
    })
    .optional(),
  designerEmail: z.string().email().optional(),
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

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;
  const current = allowed.product;

  const json = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  let coverPatch = parsed.data.cover;
  let nextOwnerEmail: string | undefined;

  if (coverPatch && !canReassignDesigner(auth.user)) {
    const { designer: _ignored, ...rest } = coverPatch;
    coverPatch = rest;
  }

  if (parsed.data.designerEmail) {
    if (!canReassignDesigner(auth.user)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }
    const email = parsed.data.designerEmail.toLowerCase();
    if (email !== current.createdByEmail.toLowerCase()) {
      const designers = await listAssignableDesigners();
      const next = designers.find((item) => item.email.toLowerCase() === email);
      if (!next) {
        return NextResponse.json(
          { error: "Designer no válido." },
          { status: 400 },
        );
      }
      nextOwnerEmail = next.email;
      coverPatch = {
        ...(coverPatch ?? {}),
        designer: next.name,
      };
    }
  }

  const updated = coverPatch
    ? await updateProductCover(id, {
        brand: parsed.data.brand ?? current.brand,
        retailer: parsed.data.retailer ?? current.retailer,
        season: parsed.data.season ?? current.season,
        style: parsed.data.style ?? current.style,
        shortDescription:
          parsed.data.shortDescription ?? current.shortDescription,
        cover: {
          ...current.cover.data,
          ...coverPatch,
        },
        updatedByEmail: auth.user.email,
        createdByEmail: nextOwnerEmail,
      })
    : await updateProductBasics(id, {
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
      retailer: updated.retailer,
      season: updated.season,
      style: updated.style,
      shortDescription: updated.shortDescription,
      status: updated.status,
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const deleted = await deleteProduct(id);
  if (!deleted) {
    return NextResponse.json({ error: "No se pudo eliminar." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
