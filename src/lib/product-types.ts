import type { ObjectId } from "mongodb";

export const PRODUCT_STATUSES = ["BORRADOR", "DEFINITIVA"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PAGE_KINDS = ["labels", "sizeSpec", "collage"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

export const DEFAULT_LABELS_TITLE =
  "LABELS AND HANG TAG / CARE LABEL / FABRIC QUALITY";
export const DEFAULT_SIZE_SPEC_TITLE = "SIZE SPEC";

export const SEED_COLLAGE_TITLES = [
  "Details",
  "Fit Picture",
  "Color Pattern Design",
  "Print",
] as const;

export type ImageSlot = {
  publicId?: string;
  url?: string;
  width?: number;
  height?: number;
};

export const COVER_IMAGE_KEYS = [
  "details",
  "hangTag",
  "swatch1",
  "swatch2",
  "swatch3",
  "swatch4",
] as const;
export type CoverImageKey = (typeof COVER_IMAGE_KEYS)[number];

export const MAX_COLLAGE_IMAGES = 16;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
] as const;

export const PACKING_OPTIONS = ["WRINKLE", "FLAT"] as const;
export const FABRIC_TYPE_OPTIONS = ["SWEATER", "PLAIN", "KNIT", "JEANS"] as const;
export const EXHIBITION_OPTIONS = ["HANGER", "VST", "POLYBAG", "IN BOX"] as const;
export const DIVISION_OPTIONS = ["MUJER", "HOMBRE", "KIDS"] as const;
export const COUNTRY_OPTIONS = ["Perú", "Chile"] as const;
export const BRAND_TYPE_OPTIONS = ["PROPIA", "LICENCIA"] as const;
export const SIZE_BREAKDOWN_OPTIONS = [
  { value: "NUMERIC", label: "NUMERIC (36, 38, etc.)" },
  { value: "ALPHANUMERIC", label: "ALPHANUMERIC (XS, S, M, L)" },
] as const;

export type CoverData = {
  brand: string;
  retailer: string;
  season: string;
  shortDescription: string;
  style: string;
  evento: string;
  packing: string[];
  fabricType: string[];
  exhibition: string[];
  mainFabric: string;
  secondFabric: string;
  designer: string;
  division: string[];
  country: string[];
  sampleSize: string;
  delivery: string;
  washProcess: string;
  brandType: string[];
  brandManager: string;
  sizeBreakdown: string[];
  meetingDate: string;
  generalComments: string;
  accessoriesColor: string;
  proformaColors: string[];
};

export type CoverSection = {
  data: CoverData;
  images: {
    details?: ImageSlot | null;
    hangTag?: ImageSlot | null;
    swatch1?: ImageSlot | null;
    swatch2?: ImageSlot | null;
    swatch3?: ImageSlot | null;
    swatch4?: ImageSlot | null;
  };
};

function asList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;/]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toMonthYear(value: unknown): string {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
}

export function emptyCoverData(input: {
  brand: string;
  retailer: string;
  season: string;
  style: string;
  shortDescription: string;
  designer?: string;
}): CoverData {
  return {
    brand: input.brand,
    retailer: input.retailer,
    season: input.season,
    shortDescription: input.shortDescription,
    style: input.style,
    evento: "",
    packing: [],
    fabricType: [],
    exhibition: [],
    mainFabric: "",
    secondFabric: "",
    designer: (input.designer ?? "").trim(),
    division: [],
    country: [],
    sampleSize: "",
    delivery: "",
    washProcess: "",
    brandType: [],
    brandManager: "",
    sizeBreakdown: [],
    meetingDate: "",
    generalComments: "",
    accessoriesColor: "",
    proformaColors: ["", "", "", ""],
  };
}

export function normalizeCoverData(
  raw: Partial<CoverData> & Record<string, unknown>,
  header: {
    brand: string;
    retailer: string;
    season: string;
    style: string;
    shortDescription: string;
  },
): CoverData {
  const base = emptyCoverData(header);
  const proforma = Array.isArray(raw.proformaColors)
    ? [...raw.proformaColors.map((c) => String(c ?? "")), "", "", ""].slice(0, 4)
    : base.proformaColors;

  return {
    ...base,
    evento: String(raw.evento ?? "").trim(),
    packing: asList(raw.packing),
    fabricType: asList(raw.fabricType),
    exhibition: asList(raw.exhibition),
    mainFabric: String(raw.mainFabric ?? raw.shellFabric ?? "").trim(),
    secondFabric: String(raw.secondFabric ?? "").trim(),
    designer: String(
      raw.designer ??
        (Array.isArray(raw.designers) ? raw.designers.join(", ") : ""),
    ).trim(),
    division: asList(raw.division),
    country: asList(
      raw.country ??
        (Array.isArray(raw.countries) ? raw.countries : undefined),
    ),
    sampleSize: String(raw.sampleSize ?? "").trim(),
    delivery: String(raw.delivery ?? "").trim(),
    washProcess: String(raw.washProcess ?? "").trim(),
    brandType: asList(raw.brandType),
    brandManager: String(
      raw.brandManager ??
        (Array.isArray(raw.tDesigners) ? raw.tDesigners.join(", ") : ""),
    ).trim(),
    sizeBreakdown: asList(raw.sizeBreakdown),
    meetingDate: toMonthYear(raw.meetingDate),
    generalComments: String(raw.generalComments ?? "").trim(),
    accessoriesColor: String(raw.accessoriesColor ?? "").trim(),
    proformaColors: proforma,
    brand: header.brand,
    retailer: header.retailer,
    season: header.season,
    style: header.style,
    shortDescription: header.shortDescription,
  };
}

export type ProductPage = {
  id: string;
  kind: PageKind;
  title: string;
  images: ImageSlot[];
  order: number;
};

export type Product = {
  _id?: ObjectId;
  brand: string;
  retailer: string;
  season: string;
  style: string;
  shortDescription: string;
  status: ProductStatus;
  version: number;
  cover: CoverSection;
  pages: ProductPage[];
  createdAt: Date;
  updatedAt: Date;
  createdByEmail: string;
  updatedByEmail: string;
};

export function pageKindLabel(kind: PageKind): string {
  switch (kind) {
    case "labels":
      return "Labels";
    case "sizeSpec":
      return "Size Specs";
    case "collage":
      return "Collage";
  }
}

export function defaultTitleForKind(kind: PageKind): string {
  switch (kind) {
    case "labels":
      return DEFAULT_LABELS_TITLE;
    case "sizeSpec":
      return DEFAULT_SIZE_SPEC_TITLE;
    case "collage":
      return "";
  }
}

export function emptyImagesForKind(kind: PageKind): ImageSlot[] {
  switch (kind) {
    case "labels":
      return [{}, {}];
    case "sizeSpec":
      return [{}];
    case "collage":
      return [];
  }
}

export function createEmptyProductTemplate(input: {
  brand: string;
  retailer: string;
  season: string;
  style: string;
  shortDescription: string;
  createdByEmail: string;
  designerName?: string;
}): Product {
  const now = new Date();
  const brand = input.brand.trim();
  const retailer = input.retailer.trim();
  const season = input.season.trim();
  const style = input.style.trim();
  const shortDescription = input.shortDescription.trim();

  return {
    brand,
    retailer,
    season,
    style,
    shortDescription,
    status: "BORRADOR",
    version: 1,
    cover: {
      data: emptyCoverData({
        brand,
        retailer,
        season,
        style,
        shortDescription,
        designer: input.designerName,
      }),
      images: {
        details: null,
        hangTag: null,
        swatch1: null,
        swatch2: null,
        swatch3: null,
        swatch4: null,
      },
    },
    pages: [],
    createdAt: now,
    updatedAt: now,
    createdByEmail: input.createdByEmail.trim().toLowerCase(),
    updatedByEmail: input.createdByEmail.trim().toLowerCase(),
  };
}

type LegacyProduct = Product & {
  collages?: Array<{
    id: string;
    title?: string;
    pageType?: string;
    images?: ImageSlot[];
    order?: number;
  }>;
};

export function normalizeProduct(doc: LegacyProduct): Product {
  const brand = (doc.brand || doc.cover?.data?.brand || "").trim();
  const retailer = (
    doc.retailer ||
    doc.cover?.data?.retailer ||
    ""
  ).trim();
  const season = (doc.season || doc.cover?.data?.season || "").trim();
  const style = (doc.style || doc.cover?.data?.style || "").trim();
  const shortDescription = (
    doc.shortDescription ||
    doc.cover?.data?.shortDescription ||
    ""
  ).trim();

  let pages: ProductPage[] = Array.isArray(doc.pages)
    ? doc.pages.map((page, index) => ({
        id: page.id,
        kind: PAGE_KINDS.includes(page.kind) ? page.kind : "collage",
        title: (page.title || defaultTitleForKind(page.kind || "collage")).trim(),
        images: Array.isArray(page.images) ? page.images : [],
        order: page.order ?? index,
      }))
    : [];

  if (pages.length === 0 && Array.isArray(doc.collages) && doc.collages.length) {
    pages = doc.collages.map((page, index) => ({
      id: page.id,
      kind: "collage" as const,
      title: (page.title || "").trim(),
      images: Array.isArray(page.images) ? page.images : [],
      order: page.order ?? index,
    }));
  }

  const cover: CoverSection = {
    images: {
      details: doc.cover?.images?.details ?? null,
      hangTag: doc.cover?.images?.hangTag ?? null,
      swatch1: doc.cover?.images?.swatch1 ?? null,
      swatch2: doc.cover?.images?.swatch2 ?? null,
      swatch3: doc.cover?.images?.swatch3 ?? null,
      swatch4: doc.cover?.images?.swatch4 ?? null,
    },
    data: normalizeCoverData(
      (doc.cover?.data ?? {}) as CoverData & Record<string, unknown>,
      { brand, retailer, season, style, shortDescription },
    ),
  };

  return {
    _id: doc._id,
    brand,
    retailer,
    season,
    style,
    shortDescription,
    status: doc.status,
    version: doc.version,
    cover,
    pages: pages.sort((a, b) => a.order - b.order),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    createdByEmail: doc.createdByEmail,
    updatedByEmail: doc.updatedByEmail,
  };
}

export function isFilledImage(slot: ImageSlot | null | undefined): boolean {
  return Boolean(slot && (slot.url || slot.publicId));
}

export function filledImageCount(images: ImageSlot[] | undefined) {
  if (!images?.length) return 0;
  return images.filter((slot) => isFilledImage(slot)).length;
}

export function collageGrid(count: number): { cols: number; rows: number } {
  const n = Math.max(0, count);
  if (n <= 1) return { cols: 1, rows: 1 };
  if (n === 2) return { cols: 1, rows: 2 };
  if (n <= 4) return { cols: 2, rows: Math.ceil(n / 2) };
  if (n <= 9) return { cols: 3, rows: Math.ceil(n / 3) };
  return { cols: 4, rows: Math.ceil(n / 4) };
}

export function filledCoverSlots(
  images: CoverSection["images"] | undefined,
) {
  if (!images) return 0;
  return Object.values(images).filter((slot) =>
    Boolean(slot && (slot.url || slot.publicId)),
  ).length;
}
