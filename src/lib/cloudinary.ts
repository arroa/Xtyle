import "server-only";

import { v2 as cloudinary } from "cloudinary";

import type { ImageSlot } from "@/lib/product-types";

let configured = false;

export function cloudinaryErrorMessage(error: unknown): string {
  if (!error) return "No se pudo subir la imagen.";
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message.trim()) {
    return friendlyCloudinaryMessage(error.message);
  }
  if (typeof error === "object") {
    const obj = error as {
      message?: unknown;
      http_code?: unknown;
      error?: { message?: unknown };
    };
    const raw =
      (typeof obj.message === "string" && obj.message) ||
      (typeof obj.error?.message === "string" && obj.error.message) ||
      "";
    if (obj.http_code === 403 || raw.includes("403")) {
      return friendlyCloudinaryMessage(raw || "403");
    }
    if (raw) return friendlyCloudinaryMessage(raw);
  }
  return "No se pudo subir la imagen.";
}

function friendlyCloudinaryMessage(raw: string) {
  const lower = raw.toLowerCase();
  if (lower.includes("cloud_name mismatch")) {
    return "Cloudinary rechazó CLOUDINARY_CLOUD_NAME. En la consola (Settings → API Keys) copia el Cloud name: es un slug (tipo dxxxx), no el nombre del producto.";
  }
  if (lower.includes("invalid signature")) {
    return "Cloudinary rechazó la firma. Revisa CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.";
  }
  if (lower.includes("403") || lower.includes("not allowed")) {
    return "Cloudinary 403: esa API key no tiene rol de Upload. En Settings → API Keys genera una key nueva y en Roles elige Master Admin (las keys nuevas nacen sin permisos). Usa esa key/secret en .env.local y reinicia el servidor.";
  }
  return raw;
}

function dataUriFromBuffer(buffer: Buffer) {
  const mime =
    buffer[0] === 0x89 && buffer[1] === 0x50
      ? "image/png"
      : buffer[0] === 0xff && buffer[1] === 0xd8
        ? "image/jpeg"
        : buffer[0] === 0x47 && buffer[1] === 0x49
          ? "image/gif"
          : buffer[0] === 0x52 && buffer[1] === 0x49
            ? "image/webp"
            : "application/octet-stream";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function ensureConfig() {
  if (configured) return;
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret) {
    throw new Error(
      "Cloudinary no está configurado. Completa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.",
    );
  }
  cloudinary.config({ cloud_name, api_key, api_secret, secure: true });
  configured = true;
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}

export function cloudinaryRootFolder() {
  return process.env.CLOUDINARY_FOLDER?.trim() || "Xtyle";
}

export function productAssetFolder(productId: string, suffix: string) {
  return `${cloudinaryRootFolder()}/${productId}/${suffix}`;
}

function isForbidden(error: unknown) {
  if (!error || typeof error !== "object") {
    return error instanceof Error && /403|not allowed/i.test(error.message);
  }
  const obj = error as { http_code?: unknown; message?: unknown };
  return (
    obj.http_code === 403 ||
    (typeof obj.message === "string" && /403|not allowed/i.test(obj.message))
  );
}

export async function uploadProductImage(input: {
  buffer: Buffer;
  folder: string;
  publicId?: string;
}): Promise<ImageSlot> {
  ensureConfig();
  const file = dataUriFromBuffer(input.buffer);
  const base = {
    public_id: input.publicId,
    overwrite: Boolean(input.publicId),
    resource_type: "image" as const,
    unique_filename: !input.publicId,
    use_filename: false,
  };

  try {
    try {
      const uploaded = await cloudinary.uploader.upload(file, {
        ...base,
        asset_folder: input.folder,
      });
      return slotFromUpload(uploaded);
    } catch (error) {
      if (!isForbidden(error)) {
        throw error;
      }
      const uploaded = await cloudinary.uploader.upload(file, base);
      return slotFromUpload(uploaded);
    }
  } catch (error) {
    throw new Error(cloudinaryErrorMessage(error));
  }
}

function slotFromUpload(uploaded: {
  public_id: string;
  secure_url: string;
  width?: number;
  height?: number;
}): ImageSlot {
  return {
    publicId: uploaded.public_id,
    url: uploaded.secure_url,
    width: uploaded.width,
    height: uploaded.height,
  };
}

export async function destroyImage(publicId: string | undefined) {
  const id = publicId?.trim();
  if (!id || !isCloudinaryConfigured()) return;
  try {
    ensureConfig();
    await cloudinary.uploader.destroy(id, { resource_type: "image" });
  } catch {
    // El archivo puede ya no existir; no bloqueamos la ficha.
  }
}

export async function destroyImages(slots: Array<ImageSlot | null | undefined>) {
  await Promise.all(
    slots.map((slot) => destroyImage(slot?.publicId)),
  );
}

export async function destroyProductAssets(productId: string) {
  if (!isCloudinaryConfigured()) return;
  const prefix = `${cloudinaryRootFolder()}/${productId}`;
  try {
    ensureConfig();
    await cloudinary.api.delete_resources_by_prefix(prefix);
  } catch {
    // Limpieza best-effort.
  }
}

export function pdfImageUrl(slot: ImageSlot): string | null {
  const url = slot.url?.trim();
  if (url?.includes("/upload/")) {
    return url.replace("/upload/", "/upload/f_jpg,q_auto/");
  }
  if (url) return url;
  const publicId = slot.publicId?.trim();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  if (publicId && cloud) {
    return `https://res.cloudinary.com/${cloud}/image/upload/f_jpg,q_auto/${publicId}`;
  }
  return null;
}
