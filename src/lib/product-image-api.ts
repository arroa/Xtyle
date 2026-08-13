import type {
  CoverSection,
  ImageSlot,
  ProductPage,
} from "@/lib/product-types";

type ImageApiResponse = {
  ok?: boolean;
  error?: string;
  image?: ImageSlot;
  coverImages?: CoverSection["images"];
  page?: ProductPage | null;
  pages?: ProductPage[];
};

async function parseResponse(res: Response): Promise<ImageApiResponse> {
  const data = (await res.json().catch(() => null)) as ImageApiResponse | null;
  if (!res.ok) {
    return { error: data?.error ?? "No se pudo completar la operación." };
  }
  return data ?? { error: "Respuesta vacía." };
}

export async function uploadProductFile(
  productId: string,
  fields: Record<string, string>,
  file: File,
): Promise<ImageApiResponse> {
  const form = new FormData();
  form.set("file", file);
  for (const [key, value] of Object.entries(fields)) {
    form.set(key, value);
  }
  const res = await fetch(`/api/products/${productId}/images`, {
    method: "POST",
    body: form,
  });
  return parseResponse(res);
}

export async function deleteProductFile(
  productId: string,
  body: Record<string, string | number>,
): Promise<ImageApiResponse> {
  const res = await fetch(`/api/products/${productId}/images`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseResponse(res);
}
