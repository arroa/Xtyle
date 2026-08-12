import type { ObjectId } from "mongodb";

export const PRODUCT_STATUSES = ["BORRADOR", "DEFINITIVA"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_SECTIONS = [
  "cover",
  "label",
  "sizeTable",
  "sizeCuts",
  "collages",
] as const;
export type ProductSection = (typeof PRODUCT_SECTIONS)[number];

export type ImageSlot = {
  /** Referencia Cloudinary / URL cuando exista */
  publicId?: string;
  url?: string;
  width?: number;
  height?: number;
};

export type CoverSection = {
  /** Datos en posiciones fijas (se completan por UI o Excel) */
  data: {
    brand: string;
    retailer: string;
    season: string;
    meetingDate: string;
    division: string;
    countries: string[];
    shortDescription: string;
    style: string;
    delivery: string;
    designers: string[];
    tDesigners: string[];
    fabricType: string;
    shellFabric: string;
    washProcess: string;
    sampleSize: string;
    packing: string;
    exhibition: string;
    generalComments: string;
  };
  /** Slots fijos de imagen */
  images: {
    front?: ImageSlot | null;
    back?: ImageSlot | null;
    accessory?: ImageSlot | null;
    swatch1?: ImageSlot | null;
    swatch2?: ImageSlot | null;
  };
};

export type LabelSection = {
  images: {
    primary?: ImageSlot | null;
    secondary?: ImageSlot | null;
  };
};

export type SizeTableSection = {
  /** Excel original asociado (referencia) */
  sourceFile?: {
    url?: string;
    publicId?: string;
    fileName?: string;
  } | null;
  /** Filas importadas (estructura mínima; crece con la plantilla Excel) */
  rows: Record<string, string | number | null>[];
};

export type SizeCutsSection = {
  images: {
    primary?: ImageSlot | null;
    secondary?: ImageSlot | null;
  };
};

export type CollagePage = {
  id: string;
  title: string;
  pageType: string;
  images: ImageSlot[];
  order: number;
};

export type Product = {
  _id?: ObjectId;
  brand: string;
  style: string;
  shortDescription: string;
  status: ProductStatus;
  version: number;
  cover: CoverSection;
  label: LabelSection;
  sizeTable: SizeTableSection;
  sizeCuts: SizeCutsSection;
  collages: CollagePage[];
  createdAt: Date;
  updatedAt: Date;
  createdByEmail: string;
  updatedByEmail: string;
};

export function createEmptyProductTemplate(input: {
  brand: string;
  style: string;
  shortDescription: string;
  createdByEmail: string;
}): Product {
  const now = new Date();
  const brand = input.brand.trim();
  const style = input.style.trim();
  const shortDescription = input.shortDescription.trim();

  return {
    brand,
    style,
    shortDescription,
    status: "BORRADOR",
    version: 1,
    cover: {
      data: {
        brand,
        retailer: "",
        season: "",
        meetingDate: "",
        division: "",
        countries: [],
        shortDescription,
        style,
        delivery: "",
        designers: [],
        tDesigners: [],
        fabricType: "",
        shellFabric: "",
        washProcess: "",
        sampleSize: "",
        packing: "",
        exhibition: "",
        generalComments: "",
      },
      images: {
        front: null,
        back: null,
        accessory: null,
        swatch1: null,
        swatch2: null,
      },
    },
    label: {
      images: {
        primary: null,
        secondary: null,
      },
    },
    sizeTable: {
      sourceFile: null,
      rows: [],
    },
    sizeCuts: {
      images: {
        primary: null,
        secondary: null,
      },
    },
    collages: [],
    createdAt: now,
    updatedAt: now,
    createdByEmail: input.createdByEmail.trim().toLowerCase(),
    updatedByEmail: input.createdByEmail.trim().toLowerCase(),
  };
}

export function sectionLabel(section: ProductSection): string {
  switch (section) {
    case "cover":
      return "Carátula";
    case "label":
      return "Etiqueta";
    case "sizeTable":
      return "SizeTable";
    case "sizeCuts":
      return "SizeCuts";
    case "collages":
      return "Collages";
  }
}
