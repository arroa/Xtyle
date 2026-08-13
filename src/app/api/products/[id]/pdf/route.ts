import { NextResponse } from "next/server";

import { requireUser } from "@/lib/api-auth";
import { buildProductPdf, productPdfFileName } from "@/lib/product-pdf";
import { getProductById } from "@/lib/products";
import { resolveDesignerName } from "@/lib/users";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const product = await getProductById(id);
  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  product.cover.data.designer = await resolveDesignerName({
    designer: product.cover.data.designer,
    createdByEmail: product.createdByEmail,
  });

  const bytes = await buildProductPdf(product);
  const fileName = productPdfFileName(product);

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
