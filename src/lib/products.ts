import "server-only";

import { ObjectId, type Collection } from "mongodb";
import { randomUUID } from "crypto";

import { getDb } from "@/lib/mongodb";
import { destroyImages, destroyProductAssets } from "@/lib/cloudinary";
import {
  COVER_IMAGE_KEYS,
  MAX_COLLAGE_IMAGES,
  createEmptyProductTemplate,
  defaultTitleForKind,
  emptyImagesForKind,
  isFilledImage,
  normalizeCoverData,
  normalizeProduct,
  PAGE_KINDS,
  SEED_COLLAGE_TITLES,
  type CoverData,
  type CoverImageKey,
  type ImageSlot,
  type PageKind,
  type Product,
  type ProductPage,
} from "@/lib/product-types";

const COLLECTION = "products";

async function productsCollection(): Promise<Collection<Product>> {
  const db = await getDb();
  return db.collection<Product>(COLLECTION);
}

export async function ensureProductIndexes() {
  const col = await productsCollection();
  await col.createIndex({ brand: 1 });
  await col.createIndex({ retailer: 1 });
  await col.createIndex({ season: 1 });
  await col.createIndex({ style: 1 });
  await col.createIndex({ status: 1, updatedAt: -1 });
  await col.createIndex({
    shortDescription: "text",
    style: "text",
    brand: "text",
    retailer: "text",
    season: "text",
  });
}

export async function listProducts(query?: {
  q?: string;
  status?: string;
}): Promise<Product[]> {
  const col = await productsCollection();
  const filter: Record<string, unknown> = {};

  if (query?.status) {
    filter.status = query.status;
  }

  if (query?.q?.trim()) {
    const q = query.q.trim();
    filter.$or = [
      { brand: { $regex: q, $options: "i" } },
      { retailer: { $regex: q, $options: "i" } },
      { season: { $regex: q, $options: "i" } },
      { style: { $regex: q, $options: "i" } },
      { shortDescription: { $regex: q, $options: "i" } },
    ];
  }

  const docs = await col.find(filter).sort({ updatedAt: -1 }).toArray();
  return docs.map((doc) => normalizeProduct(doc));
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await productsCollection();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  return doc ? normalizeProduct(doc) : null;
}

export async function createProduct(input: {
  brand: string;
  retailer: string;
  season: string;
  style: string;
  shortDescription: string;
  createdByEmail: string;
  designerName: string;
}): Promise<Product> {
  const col = await productsCollection();
  const doc = createEmptyProductTemplate(input);
  const result = await col.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function listFieldSuggestions(): Promise<{
  brands: string[];
  retailers: string[];
  seasons: string[];
  collageTitles: string[];
}> {
  const col = await productsCollection();
  const [brands, retailers, seasons, collageTitles] = await Promise.all([
    col.distinct("brand"),
    col.distinct("retailer"),
    col.distinct("season"),
    col.distinct("pages.title", { "pages.kind": "collage" }),
  ]);

  return {
    brands: uniqueSorted(brands),
    retailers: uniqueSorted(retailers),
    seasons: uniqueSorted(seasons),
    collageTitles: uniqueSorted([...SEED_COLLAGE_TITLES, ...collageTitles]),
  };
}

function uniqueSorted(values: unknown[]): string[] {
  return [...new Set(values.map((v) => String(v ?? "").trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, "es", { sensitivity: "base" }),
  );
}

export async function updateProductCover(
  id: string,
  input: {
    brand: string;
    retailer: string;
    season: string;
    style: string;
    shortDescription: string;
    cover: CoverData;
    updatedByEmail: string;
    createdByEmail?: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await productsCollection();

  const brand = input.brand.trim();
  const retailer = input.retailer.trim();
  const season = input.season.trim();
  const style = input.style.trim();
  const shortDescription = input.shortDescription.trim();
  const data = normalizeCoverData(input.cover, {
    brand,
    retailer,
    season,
    style,
    shortDescription,
  });

  const $set: Record<string, unknown> = {
    brand,
    retailer,
    season,
    style,
    shortDescription,
    "cover.data": data,
    updatedAt: new Date(),
    updatedByEmail: input.updatedByEmail.trim().toLowerCase(),
  };
  if (input.createdByEmail) {
    $set.createdByEmail = input.createdByEmail.trim().toLowerCase();
  }

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), status: "BORRADOR" },
    { $set },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function updateProductBasics(
  id: string,
  patch: {
    brand?: string;
    retailer?: string;
    season?: string;
    style?: string;
    shortDescription?: string;
    updatedByEmail: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await productsCollection();

  const $set: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedByEmail: patch.updatedByEmail.trim().toLowerCase(),
  };

  if (typeof patch.brand === "string") {
    $set.brand = patch.brand.trim();
    $set["cover.data.brand"] = patch.brand.trim();
  }
  if (typeof patch.retailer === "string") {
    $set.retailer = patch.retailer.trim();
    $set["cover.data.retailer"] = patch.retailer.trim();
  }
  if (typeof patch.season === "string") {
    $set.season = patch.season.trim();
    $set["cover.data.season"] = patch.season.trim();
  }
  if (typeof patch.style === "string") {
    $set.style = patch.style.trim();
    $set["cover.data.style"] = patch.style.trim();
  }
  if (typeof patch.shortDescription === "string") {
    $set.shortDescription = patch.shortDescription.trim();
    $set["cover.data.shortDescription"] = patch.shortDescription.trim();
  }

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), status: "BORRADOR" },
    { $set },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function cloneProduct(
  id: string,
  createdByEmail: string,
  designerName: string,
): Promise<Product | null> {
  const source = await getProductById(id);
  if (!source) return null;

  const now = new Date();
  const email = createdByEmail.trim().toLowerCase();
  const { _id: _ignored, ...rest } = source;

  const clone: Product = {
    ...structuredClone(rest),
    style: `${source.style} COPY`,
    status: "BORRADOR",
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdByEmail: email,
    updatedByEmail: email,
    pages: (source.pages ?? []).map((page, index) => ({
      ...structuredClone(page),
      id: randomUUID(),
      order: index,
    })),
  };

  clone.cover.data.brand = clone.brand;
  clone.cover.data.retailer = clone.retailer;
  clone.cover.data.season = clone.season;
  clone.cover.data.style = clone.style;
  clone.cover.data.shortDescription = clone.shortDescription;
  clone.cover.data.designer = designerName.trim();

  const col = await productsCollection();
  const result = await col.insertOne(clone);
  return { ...clone, _id: result.insertedId };
}

export async function addProductPage(
  productId: string,
  input: {
    kind: PageKind;
    title?: string;
    updatedByEmail: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  if (!PAGE_KINDS.includes(input.kind)) return null;

  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const title = (
    input.title?.trim() || defaultTitleForKind(input.kind)
  ).slice(0, 120);

  if (input.kind === "collage" && !title) return null;

  const page: ProductPage = {
    id: randomUUID(),
    kind: input.kind,
    title,
    images: emptyImagesForKind(input.kind),
    order: product.pages.length,
  };

  const pages = [...product.pages, page];

  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $unset: { collages: "", label: "", sizeTable: "", sizeCuts: "" },
      $set: {
        pages,
        updatedAt: new Date(),
        updatedByEmail: input.updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function updateProductPage(
  productId: string,
  pageId: string,
  patch: {
    title?: string;
    updatedByEmail: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const pages = product.pages.map((page) => {
    if (page.id !== pageId) return page;
    return {
      ...page,
      title:
        typeof patch.title === "string"
          ? patch.title.trim().slice(0, 120) || page.title
          : page.title,
    };
  });

  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $unset: { collages: "", label: "", sizeTable: "", sizeCuts: "" },
      $set: {
        pages,
        updatedAt: new Date(),
        updatedByEmail: patch.updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function reorderProductPages(
  productId: string,
  pageIds: string[],
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const currentIds = product.pages.map((page) => page.id);
  if (
    pageIds.length !== currentIds.length ||
    new Set(pageIds).size !== pageIds.length ||
    !pageIds.every((id) => currentIds.includes(id))
  ) {
    return null;
  }

  const byId = new Map(product.pages.map((page) => [page.id, page]));
  const pages = pageIds.map((id, index) => ({
    ...byId.get(id)!,
    order: index,
  }));

  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $unset: { collages: "", label: "", sizeTable: "", sizeCuts: "" },
      $set: {
        pages,
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function removeProductPage(
  productId: string,
  pageId: string,
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const removed = product.pages.find((page) => page.id === pageId);
  const pages = product.pages
    .filter((page) => page.id !== pageId)
    .map((page, index) => ({ ...page, order: index }));

  if (removed) void destroyImages(removed.images);

  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $unset: { collages: "", label: "", sizeTable: "", sizeCuts: "" },
      $set: {
        pages,
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function releaseProduct(
  id: string,
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), status: "BORRADOR" },
    {
      $set: {
        status: "DEFINITIVA",
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function setCoverImage(
  id: string,
  slot: CoverImageKey,
  image: ImageSlot,
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(id) || !COVER_IMAGE_KEYS.includes(slot)) return null;
  const product = await getProductById(id);
  if (!product || product.status !== "BORRADOR") return null;

  const previous = product.cover.images[slot];
  if (previous?.publicId && previous.publicId !== image.publicId) {
    void destroyImages([previous]);
  }

  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), status: "BORRADOR" },
    {
      $set: {
        [`cover.images.${slot}`]: image,
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function clearCoverImage(
  id: string,
  slot: CoverImageKey,
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(id) || !COVER_IMAGE_KEYS.includes(slot)) return null;
  const product = await getProductById(id);
  if (!product || product.status !== "BORRADOR") return null;

  void destroyImages([product.cover.images[slot]]);

  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(id), status: "BORRADOR" },
    {
      $set: {
        [`cover.images.${slot}`]: null,
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

function pageImageCapacity(kind: PageKind, currentLength: number) {
  if (kind === "labels") return 2;
  if (kind === "sizeSpec") return 1;
  return Math.max(currentLength, 0);
}

export async function setPageImage(
  productId: string,
  pageId: string,
  input: {
    image: ImageSlot;
    index?: number;
    updatedByEmail: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const page = product.pages.find((item) => item.id === pageId);
  if (!page) return null;

  const email = input.updatedByEmail.trim().toLowerCase();

  if (page.kind === "collage" && typeof input.index !== "number") {
    if (filledImageCountSafe(page.images) >= MAX_COLLAGE_IMAGES) return null;
    return appendPageImage(productId, pageId, input.image, email);
  }

  let previous: ImageSlot | undefined;
  const images = [...page.images];
  const capacity = pageImageCapacity(page.kind, images.length);

  if (page.kind === "collage") {
    if (input.index! < 0 || input.index! >= images.length) return null;
    previous = images[input.index!];
    images[input.index!] = input.image;
  } else {
    const index = input.index ?? 0;
    if (index < 0 || index >= capacity) return null;
    while (images.length < capacity) images.push({});
    previous = images[index];
    images[index] = input.image;
  }

  if (previous?.publicId && previous.publicId !== input.image.publicId) {
    void destroyImages([previous]);
  }

  return persistPageImages(productId, pageId, images, email);
}

async function appendPageImage(
  productId: string,
  pageId: string,
  image: ImageSlot,
  updatedByEmail: string,
): Promise<Product | null> {
  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR", "pages.id": pageId },
    {
      $push: {
        "pages.$.images": {
          $each: [image],
          $slice: MAX_COLLAGE_IMAGES,
        },
      },
      $set: {
        updatedAt: new Date(),
        updatedByEmail,
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function clearPageImage(
  productId: string,
  pageId: string,
  index: number,
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const page = product.pages.find((item) => item.id === pageId);
  if (!page || index < 0 || index >= page.images.length) return null;

  const previous = page.images[index];
  void destroyImages([previous]);

  let images: ImageSlot[];
  if (page.kind === "collage") {
    images = page.images.filter((_, i) => i !== index);
  } else {
    images = page.images.map((slot, i) => (i === index ? {} : slot));
  }

  return persistPageImages(productId, pageId, images, updatedByEmail);
}

function filledImageCountSafe(images: ImageSlot[]) {
  return images.filter((slot) => isFilledImage(slot)).length;
}

async function persistPageImages(
  productId: string,
  pageId: string,
  images: ImageSlot[],
  updatedByEmail: string,
): Promise<Product | null> {
  const col = await productsCollection();
  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR", "pages.id": pageId },
    {
      $set: {
        "pages.$.images": images,
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ? normalizeProduct(result) : null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (!ObjectId.isValid(id)) return false;
  const col = await productsCollection();
  const result = await col.deleteOne({ _id: new ObjectId(id) });
  if (result.deletedCount === 1) {
    void destroyProductAssets(id);
    return true;
  }
  return false;
}
