import "server-only";

import { ObjectId, type Collection } from "mongodb";
import { randomUUID } from "crypto";

import { getDb } from "@/lib/mongodb";
import {
  createEmptyProductTemplate,
  type Product,
} from "@/lib/product-types";

const COLLECTION = "products";

async function productsCollection(): Promise<Collection<Product>> {
  const db = await getDb();
  return db.collection<Product>(COLLECTION);
}

export async function ensureProductIndexes() {
  const col = await productsCollection();
  await col.createIndex({ brand: 1 });
  await col.createIndex({ style: 1 });
  await col.createIndex({ status: 1, updatedAt: -1 });
  await col.createIndex({ shortDescription: "text", style: "text", brand: "text" });
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
      { style: { $regex: q, $options: "i" } },
      { shortDescription: { $regex: q, $options: "i" } },
    ];
  }

  return col.find(filter).sort({ updatedAt: -1 }).toArray();
}

export async function getProductById(id: string): Promise<Product | null> {
  if (!ObjectId.isValid(id)) return null;
  const col = await productsCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function createProduct(input: {
  brand: string;
  style: string;
  shortDescription: string;
  createdByEmail: string;
}): Promise<Product> {
  const col = await productsCollection();
  const doc = createEmptyProductTemplate(input);
  const result = await col.insertOne(doc);
  return { ...doc, _id: result.insertedId };
}

export async function updateProductBasics(
  id: string,
  patch: {
    brand?: string;
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
  return result ?? null;
}

export async function cloneProduct(
  id: string,
  createdByEmail: string,
): Promise<Product | null> {
  const source = await getProductById(id);
  if (!source) return null;

  const now = new Date();
  const email = createdByEmail.trim().toLowerCase();
  const { _id: _ignored, ...rest } = source;

  const clone: Product = {
    ...structuredClone(rest),
    brand: source.brand || source.cover?.data?.brand || "",
    style: `${source.style} COPY`,
    shortDescription: source.shortDescription,
    status: "BORRADOR",
    version: 1,
    createdAt: now,
    updatedAt: now,
    createdByEmail: email,
    updatedByEmail: email,
    collages: (source.collages ?? []).map((page, index) => ({
      ...structuredClone(page),
      id: randomUUID(),
      order: index,
    })),
  };

  clone.cover.data.brand = clone.brand;
  clone.cover.data.style = clone.style;
  clone.cover.data.shortDescription = clone.shortDescription;

  const col = await productsCollection();
  const result = await col.insertOne(clone);
  return { ...clone, _id: result.insertedId };
}

export async function addCollage(
  productId: string,
  input: {
    updatedByEmail: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const col = await productsCollection();
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const order = product.collages.length;
  const page = {
    id: randomUUID(),
    title: "",
    pageType: "OTHER",
    images: [] as Product["collages"][number]["images"],
    order,
  };

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $push: { collages: page },
      $set: {
        updatedAt: new Date(),
        updatedByEmail: input.updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function updateCollage(
  productId: string,
  collageId: string,
  patch: {
    title?: string;
    updatedByEmail: string;
  },
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const col = await productsCollection();
  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const collages = product.collages.map((page) => {
    if (page.id !== collageId) return page;
    return {
      ...page,
      title:
        typeof patch.title === "string"
          ? patch.title.trim().slice(0, 120) || page.title
          : page.title,
    };
  });

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $set: {
        collages,
        updatedAt: new Date(),
        updatedByEmail: patch.updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export async function removeCollage(
  productId: string,
  collageId: string,
  updatedByEmail: string,
): Promise<Product | null> {
  if (!ObjectId.isValid(productId)) return null;
  const col = await productsCollection();

  const product = await getProductById(productId);
  if (!product || product.status !== "BORRADOR") return null;

  const collages = product.collages
    .filter((page) => page.id !== collageId)
    .map((page, index) => ({ ...page, order: index }));

  const result = await col.findOneAndUpdate(
    { _id: new ObjectId(productId), status: "BORRADOR" },
    {
      $set: {
        collages,
        updatedAt: new Date(),
        updatedByEmail: updatedByEmail.trim().toLowerCase(),
      },
    },
    { returnDocument: "after" },
  );
  return result ?? null;
}

export function canEditProducts(role: string | null, isSuperAdmin: boolean) {
  if (isSuperAdmin) return true;
  return role === "ADMIN" || role === "EDITOR";
}
