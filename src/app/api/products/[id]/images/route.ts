import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api-auth";
import {
  cloudinaryErrorMessage,
  isCloudinaryConfigured,
  productAssetFolder,
  uploadProductImage,
} from "@/lib/cloudinary";
import {
  ACCEPTED_IMAGE_TYPES,
  COVER_IMAGE_KEYS,
  MAX_IMAGE_BYTES,
} from "@/lib/product-types";
import {
  clearCoverImage,
  clearPageImage,
  getProductById,
  setCoverImage,
  setPageImage,
} from "@/lib/products";
import { requireProductMutation } from "@/lib/require-product-write";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const runtime = "nodejs";

const coverSlotSchema = z.enum(COVER_IMAGE_KEYS);

function jsonProduct(product: NonNullable<Awaited<ReturnType<typeof getProductById>>>) {
  return {
    coverImages: product.cover.images,
    pages: product.pages,
  };
}

async function fileFromForm(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return { error: "Formulario inválido." as const };
  const file = form.get("file");
  if (!(file instanceof File)) return { error: "Falta el archivo." as const };
  if (file.size <= 0) return { error: "El archivo está vacío." as const };
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "La imagen no puede superar 8 MB." as const };
  }
  const type = file.type || "application/octet-stream";
  if (
    !ACCEPTED_IMAGE_TYPES.includes(
      type as (typeof ACCEPTED_IMAGE_TYPES)[number],
    )
  ) {
    return { error: "Formato no soportado. Usa JPG, PNG, WebP o GIF." as const };
  }
  return { form, file };
}

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  if (!isCloudinaryConfigured()) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor." },
      { status: 503 },
    );
  }

  const current = allowed.product;
  if (current.status !== "BORRADOR") {
    return NextResponse.json(
      { error: "Una ficha Definitiva no se puede editar." },
      { status: 400 },
    );
  }

  const parsedFile = await fileFromForm(request);
  if ("error" in parsedFile) {
    return NextResponse.json({ error: parsedFile.error }, { status: 400 });
  }

  const target = String(parsedFile.form.get("target") ?? "");
  const buffer = Buffer.from(await parsedFile.file.arrayBuffer());

  try {
    if (target === "cover") {
      const slotParsed = coverSlotSchema.safeParse(
        String(parsedFile.form.get("slot") ?? ""),
      );
      if (!slotParsed.success) {
        return NextResponse.json({ error: "Slot de carátula inválido." }, { status: 400 });
      }
      const image = await uploadProductImage({
        buffer,
        folder: productAssetFolder(id, "cover"),
        publicId: slotParsed.data,
      });
      const product = await setCoverImage(
        id,
        slotParsed.data,
        image,
        auth.user.email,
      );
      if (!product) {
        return NextResponse.json({ error: "No se pudo guardar la imagen." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, image, ...jsonProduct(product) });
    }

    if (target === "page") {
      const pageId = String(parsedFile.form.get("pageId") ?? "").trim();
      if (!pageId) {
        return NextResponse.json({ error: "Falta la página." }, { status: 400 });
      }
      const indexRaw = parsedFile.form.get("index");
      const index =
        indexRaw == null || String(indexRaw) === ""
          ? undefined
          : Number(indexRaw);
      if (index != null && (!Number.isInteger(index) || index < 0)) {
        return NextResponse.json({ error: "Índice inválido." }, { status: 400 });
      }

      const image = await uploadProductImage({
        buffer,
        folder: productAssetFolder(id, `pages/${pageId}`),
        publicId: index == null ? undefined : `slot-${index}`,
      });
      const product = await setPageImage(id, pageId, {
        image,
        index,
        updatedByEmail: auth.user.email,
      });
      if (!product) {
        return NextResponse.json(
          { error: "No se pudo guardar (¿página llena o no es borrador?)." },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        image,
        page: product.pages.find((page) => page.id === pageId) ?? null,
        ...jsonProduct(product),
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: cloudinaryErrorMessage(error) },
      { status: 502 },
    );
  }

  return NextResponse.json({ error: "Destino inválido." }, { status: 400 });
}

const deleteSchema = z.discriminatedUnion("target", [
  z.object({
    target: z.literal("cover"),
    slot: coverSlotSchema,
  }),
  z.object({
    target: z.literal("page"),
    pageId: z.string().min(1),
    index: z.number().int().min(0),
  }),
]);

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const allowed = await requireProductMutation(auth.user, id);
  if ("error" in allowed) return allowed.error;

  const json = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const body = parsed.data;
  const product =
    body.target === "cover"
      ? await clearCoverImage(id, body.slot, auth.user.email)
      : await clearPageImage(id, body.pageId, body.index, auth.user.email);

  if (!product) {
    return NextResponse.json({ error: "No se pudo quitar la imagen." }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    page:
      body.target === "page"
        ? (product.pages.find((page) => page.id === body.pageId) ?? null)
        : null,
    ...jsonProduct(product),
  });
}
