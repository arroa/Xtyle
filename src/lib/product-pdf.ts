import "server-only";

import {
  PDFDocument,
  PageSizes,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";

import { pdfImageUrl } from "@/lib/cloudinary";
import type { CoverImageKey, ImageSlot, Product, ProductPage } from "@/lib/product-types";
import {
  BRAND_TYPE_OPTIONS,
  COUNTRY_OPTIONS,
  COVER_IMAGE_KEYS,
  DIVISION_OPTIONS,
  EXHIBITION_OPTIONS,
  FABRIC_TYPE_OPTIONS,
  PACKING_OPTIONS,
  SIZE_BREAKDOWN_OPTIONS,
  collageGrid,
  filledImageCount,
  isFilledImage,
  pageKindLabel,
} from "@/lib/product-types";

const MARGIN = 36;
const INK = rgb(0.08, 0.08, 0.1);
const MUTED = rgb(0.42, 0.42, 0.45);
const RULE = rgb(0.72, 0.72, 0.74);
const HEADER_BG = rgb(0.91, 0.91, 0.92);

function safe(value: string | number | null | undefined): string {
  if (value == null) return "";
  return String(value).trim();
}

function drawChrome(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  product: Product,
  pageTitle: string,
) {
  const { width, height } = page.getSize();
  const headerH = 28;
  const top = height - MARGIN;

  page.drawRectangle({
    x: MARGIN,
    y: top - headerH,
    width: width - MARGIN * 2,
    height: headerH,
    color: HEADER_BG,
  });

  const brand = safe(product.brand) || "—";
  const retailer = safe(product.retailer) || "—";
  const season = safe(product.season) || "—";

  page.drawText(brand, {
    x: MARGIN + 10,
    y: top - 19,
    size: 11,
    font: bold,
    color: INK,
  });

  const retailerWidth = bold.widthOfTextAtSize(retailer, 13);
  page.drawText(retailer, {
    x: (width - retailerWidth) / 2,
    y: top - 20,
    size: 13,
    font: bold,
    color: INK,
  });

  const seasonWidth = font.widthOfTextAtSize(season, 10);
  page.drawText(season, {
    x: width - MARGIN - 10 - seasonWidth,
    y: top - 19,
    size: 10,
    font,
    color: INK,
  });

  const styleY = top - headerH - 22;
  page.drawRectangle({
    x: MARGIN,
    y: styleY - 6,
    width: width - MARGIN * 2,
    height: 22,
    borderColor: RULE,
    borderWidth: 0.75,
  });
  page.drawText("STYLE", {
    x: MARGIN + 8,
    y: styleY + 2,
    size: 7,
    font,
    color: MUTED,
  });
  page.drawText(safe(product.style) || "—", {
    x: MARGIN + 52,
    y: styleY + 1,
    size: 10,
    font: bold,
    color: INK,
  });

  const pageY = styleY - 28;
  page.drawRectangle({
    x: MARGIN,
    y: pageY - 6,
    width: width - MARGIN * 2,
    height: 22,
    borderColor: RULE,
    borderWidth: 0.75,
  });
  page.drawText("PAGE", {
    x: MARGIN + 8,
    y: pageY + 2,
    size: 7,
    font,
    color: MUTED,
  });
  page.drawText(pageTitle || "—", {
    x: MARGIN + 52,
    y: pageY + 1,
    size: 10,
    font: bold,
    color: INK,
  });

  const canvasTop = pageY - 14;
  const canvasBottom = MARGIN;
  page.drawRectangle({
    x: MARGIN,
    y: canvasBottom,
    width: width - MARGIN * 2,
    height: canvasTop - canvasBottom,
    borderColor: RULE,
    borderWidth: 0.75,
  });

  return { canvasTop, canvasBottom, canvasWidth: width - MARGIN * 2 };
}

function drawSlots(
  page: PDFPage,
  font: PDFFont,
  boxes: { x: number; y: number; w: number; h: number; label: string }[],
) {
  for (const box of boxes) {
    page.drawRectangle({
      x: box.x,
      y: box.y,
      width: box.w,
      height: box.h,
      borderColor: RULE,
      borderWidth: 0.6,
    });
    page.drawText(box.label, {
      x: box.x + 8,
      y: box.y + box.h - 16,
      size: 8,
      font,
      color: MUTED,
    });
  }
}

function drawImageContain(
  page: PDFPage,
  image: PDFImage,
  box: { x: number; y: number; w: number; h: number },
) {
  if (box.w <= 2 || box.h <= 2) return;
  const ratio = image.width / image.height;
  const boxRatio = box.w / box.h;
  let w = box.w;
  let h = box.h;
  if (ratio > boxRatio) {
    h = box.w / ratio;
  } else {
    w = box.h * ratio;
  }
  page.drawImage(image, {
    x: box.x + (box.w - w) / 2,
    y: box.y + (box.h - h) / 2,
    width: w,
    height: h,
  });
}

function drawMediaBox(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  box: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    caption?: string;
    image?: PDFImage | null;
  },
) {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    borderColor: RULE,
    borderWidth: 0.6,
  });
  page.drawText(box.label.toUpperCase(), {
    x: box.x + 4,
    y: box.y + box.h - 10,
    size: 6,
    font: bold,
    color: MUTED,
  });
  if (box.caption) {
    const labelW = bold.widthOfTextAtSize(box.label.toUpperCase(), 6);
    page.drawText(box.caption.slice(0, 28), {
      x: box.x + 8 + labelW,
      y: box.y + box.h - 10,
      size: 7,
      font,
      color: INK,
      maxWidth: Math.max(12, box.w - labelW - 12),
    });
  }
  const pad = 4;
  const top = 12;
  const inner = {
    x: box.x + pad,
    y: box.y + pad,
    w: box.w - pad * 2,
    h: box.h - pad * 2 - top,
  };
  if (box.image) {
    drawImageContain(page, box.image, inner);
  }
}

async function embedSlot(
  pdf: PDFDocument,
  slot: ImageSlot | null | undefined,
): Promise<PDFImage | null> {
  if (!isFilledImage(slot) || !slot) return null;
  const url = pdfImageUrl(slot);
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    try {
      return await pdf.embedJpg(bytes);
    } catch {
      return await pdf.embedPng(bytes);
    }
  } catch {
    return null;
  }
}

function drawOneLine(
  page: PDFPage,
  text: string,
  font: PDFFont,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  color: ReturnType<typeof rgb>,
) {
  const value = text.trim();
  if (!value || maxWidth < 8) return;
  let s = size;
  let t = value;
  while (s > 5.5 && font.widthOfTextAtSize(t, s) > maxWidth) s -= 0.4;
  while (t.length > 1 && font.widthOfTextAtSize(t, s) > maxWidth) {
    t = t.slice(0, -1);
  }
  if (font.widthOfTextAtSize(t, s) > maxWidth) return;
  page.drawText(t, { x, y, size: s, font, color });
}

function drawLabeledBox(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  box: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    value?: string;
    fill?: ReturnType<typeof rgb>;
  },
) {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    borderColor: RULE,
    borderWidth: 0.6,
    color: box.fill,
  });
  page.drawText(box.label.toUpperCase(), {
    x: box.x + 4,
    y: box.y + box.h / 2 - 2,
    size: 6,
    font: bold,
    color: MUTED,
  });
  if (box.value) {
    const labelW = bold.widthOfTextAtSize(box.label.toUpperCase(), 6);
    drawOneLine(
      page,
      box.value,
      font,
      box.x + 8 + labelW,
      box.y + box.h / 2 - 2,
      Math.max(8, box.w - labelW - 12),
      8,
      INK,
    );
  }
}

function drawCheckOptions(
  page: PDFPage,
  font: PDFFont,
  x: number,
  y: number,
  options: { value: string; label: string }[],
  selected: string[] | undefined,
  maxX: number,
) {
  const chosen = selected ?? [];
  let cursor = x;
  for (const option of options) {
    const width = 11 + font.widthOfTextAtSize(option.label, 6) + 4;
    if (cursor + width > maxX) break;
    const on = chosen.includes(option.value);
    page.drawRectangle({
      x: cursor,
      y: y - 1,
      width: 7,
      height: 7,
      borderColor: INK,
      borderWidth: 0.6,
      color: on ? rgb(0.88, 0.48, 0.24) : rgb(1, 1, 1),
    });
    if (on) {
      page.drawRectangle({
        x: cursor + 2,
        y: y + 1,
        width: 3,
        height: 3,
        color: INK,
      });
    }
    page.drawText(option.label, {
      x: cursor + 9,
      y,
      size: 6,
      font,
      color: INK,
    });
    cursor += width;
  }
}

function drawOptionCell(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  box: {
    x: number;
    y: number;
    w: number;
    h: number;
    label: string;
    fill?: ReturnType<typeof rgb>;
  },
  options: { value: string; label: string }[],
  selected: string[] | undefined,
) {
  page.drawRectangle({
    x: box.x,
    y: box.y,
    width: box.w,
    height: box.h,
    borderColor: RULE,
    borderWidth: 0.6,
    color: box.fill,
  });
  const label = box.label.toUpperCase();
  const textY = box.y + box.h / 2 - 2;
  page.drawText(label, {
    x: box.x + 4,
    y: textY,
    size: 6,
    font: bold,
    color: MUTED,
  });
  const labelW = bold.widthOfTextAtSize(label, 6);
  drawCheckOptions(
    page,
    font,
    box.x + 8 + labelW,
    textY,
    options,
    selected,
    box.x + box.w - 4,
  );
}

function namedOptions(values: readonly string[]) {
  return values.map((value) => ({ value, label: value }));
}

function formatMonthYear(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})/);
  if (!match) return value;
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const month = months[Number(match[2]) - 1];
  if (!month) return `${match[2]}/${match[1]}`;
  return `${month.slice(0, 3)} ${match[1]}`;
}

function drawCoverPage(
  page: PDFPage,
  font: PDFFont,
  bold: PDFFont,
  product: Product,
  coverImages: Partial<Record<CoverImageKey, PDFImage | null>>,
) {
  const { width, height } = page.getSize();
  const data = product.cover.data;
  const x0 = MARGIN;
  const yTop = height - MARGIN;
  const innerW = width - MARGIN * 2;
  const headerH = 26;

  page.drawRectangle({
    x: x0,
    y: yTop - headerH,
    width: innerW,
    height: headerH,
    color: HEADER_BG,
  });
  page.drawText(safe(product.brand) || "—", {
    x: x0 + 8,
    y: yTop - 18,
    size: 11,
    font: bold,
    color: INK,
  });
  const retailer = safe(product.retailer) || "—";
  const retailerW = bold.widthOfTextAtSize(retailer, 13);
  page.drawText(retailer, {
    x: (width - retailerW) / 2,
    y: yTop - 18,
    size: 13,
    font: bold,
    color: INK,
  });
  const season = safe(product.season) || "—";
  const seasonW = font.widthOfTextAtSize(season, 10);
  page.drawText(season, {
    x: width - MARGIN - 8 - seasonW,
    y: yTop - 17,
    size: 10,
    font,
    color: INK,
  });

  let y = yTop - headerH;
  const row = (h: number) => {
    y -= h;
    return y;
  };

  const r1 = row(22);
  drawLabeledBox(page, font, bold, {
    x: x0,
    y: r1,
    w: innerW * 0.22,
    h: 22,
    label: "Short desc.",
    value: data.shortDescription,
  });
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.22,
    y: r1,
    w: innerW * 0.38,
    h: 22,
    label: "Style",
    value: data.style,
  });
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.6,
    y: r1,
    w: innerW * 0.18,
    h: 22,
    label: "Evento",
    value: data.evento,
  });
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0 + innerW * 0.78,
      y: r1,
      w: innerW * 0.22,
      h: 22,
      label: "Packing",
    },
    namedOptions(PACKING_OPTIONS),
    data.packing,
  );

  const r2 = row(22);
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0,
      y: r2,
      w: innerW * 0.58,
      h: 22,
      label: "Type of fabric",
    },
    namedOptions(FABRIC_TYPE_OPTIONS),
    data.fabricType,
  );
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0 + innerW * 0.58,
      y: r2,
      w: innerW * 0.42,
      h: 22,
      label: "Exhibición",
    },
    namedOptions(EXHIBITION_OPTIONS),
    data.exhibition,
  );

  const r3 = row(22);
  drawLabeledBox(page, font, bold, {
    x: x0,
    y: r3,
    w: innerW * 0.68,
    h: 22,
    label: "Main fabric",
    value: data.mainFabric,
  });
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.68,
    y: r3,
    w: innerW * 0.32,
    h: 22,
    label: "Designer",
    value: data.designer,
  });

  const r4 = row(22);
  drawLabeledBox(page, font, bold, {
    x: x0,
    y: r4,
    w: innerW * 0.18,
    h: 22,
    label: "Second fabric",
    value: data.secondFabric,
  });
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0 + innerW * 0.18,
      y: r4,
      w: innerW * 0.32,
      h: 22,
      label: "Division",
    },
    namedOptions(DIVISION_OPTIONS),
    data.division,
  );
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0 + innerW * 0.5,
      y: r4,
      w: innerW * 0.22,
      h: 22,
      label: "Country",
    },
    namedOptions(COUNTRY_OPTIONS),
    data.country,
  );
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.72,
    y: r4,
    w: innerW * 0.14,
    h: 22,
    label: "Sample size",
    value: data.sampleSize,
  });
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.86,
    y: r4,
    w: innerW * 0.14,
    h: 22,
    label: "Delivery",
    value: data.delivery,
    fill: rgb(0.93, 0.62, 0.38),
  });

  const r5 = row(22);
  drawLabeledBox(page, font, bold, {
    x: x0,
    y: r5,
    w: innerW * 0.5,
    h: 22,
    label: "Washing process",
    value: data.washProcess,
  });
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0 + innerW * 0.5,
      y: r5,
      w: innerW * 0.32,
      h: 22,
      label: "Brand type",
    },
    namedOptions(BRAND_TYPE_OPTIONS),
    data.brandType,
  );
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.82,
    y: r5,
    w: innerW * 0.18,
    h: 22,
    label: "B.M.",
    value: data.brandManager,
  });

  const r6 = row(22);
  drawOptionCell(
    page,
    font,
    bold,
    {
      x: x0,
      y: r6,
      w: innerW * 0.7,
      h: 22,
      label: "Size break-down",
    },
    [...SIZE_BREAKDOWN_OPTIONS],
    data.sizeBreakdown,
  );
  drawLabeledBox(page, font, bold, {
    x: x0 + innerW * 0.7,
    y: r6,
    w: innerW * 0.3,
    h: 22,
    label: "Meeting",
    value: formatMonthYear(data.meetingDate),
  });

  const detailsBottom = MARGIN + 118;
  drawMediaBox(page, font, bold, {
    x: x0,
    y: detailsBottom,
    w: innerW,
    h: y - detailsBottom,
    label: "Details",
    image: coverImages.details,
  });

  const footerH = 110;
  const footerY = MARGIN;
  const hangW = innerW * 0.22;
  drawLabeledBox(page, font, bold, {
    x: x0,
    y: footerY + 72,
    w: innerW - hangW,
    h: 38,
    label: "General comments",
    value: data.generalComments,
  });
  drawLabeledBox(page, font, bold, {
    x: x0,
    y: footerY + 50,
    w: innerW - hangW,
    h: 22,
    label: "Accessories color",
    value: data.accessoriesColor,
  });

  const swatchW = (innerW - hangW) / 4;
  const swatchKeys = ["swatch1", "swatch2", "swatch3", "swatch4"] as const;
  for (let i = 0; i < 4; i++) {
    drawMediaBox(page, font, bold, {
      x: x0 + i * swatchW,
      y: footerY,
      w: swatchW,
      h: 50,
      label: i === 0 ? "Proforma colors code" : " ",
      caption: data.proformaColors?.[i] || "",
      image: coverImages[swatchKeys[i]],
    });
  }
  drawMediaBox(page, font, bold, {
    x: x0 + innerW - hangW,
    y: footerY,
    w: hangW,
    h: footerH,
    label: "Respect hang tag",
    image: coverImages.hangTag,
  });
}

function drawPageBody(
  page: PDFPage,
  font: PDFFont,
  productPage: ProductPage,
  canvas: { canvasTop: number; canvasBottom: number; canvasWidth: number },
  images: Array<PDFImage | null>,
) {
  const innerX = MARGIN + 10;
  const innerW = canvas.canvasWidth - 20;
  const innerH = canvas.canvasTop - canvas.canvasBottom - 20;
  const innerBottom = canvas.canvasBottom + 10;
  const filled = filledImageCount(productPage.images);

  if (productPage.kind === "labels") {
    const gap = 10;
    const h = (innerH - gap) / 2;
    const boxes = [
      {
        x: innerX,
        y: innerBottom + h + gap,
        w: innerW,
        h,
        label: "Imagen superior",
        image: images[0],
      },
      {
        x: innerX,
        y: innerBottom,
        w: innerW,
        h,
        label: "Imagen inferior",
        image: images[1],
      },
    ];
    for (const box of boxes) {
      if (box.image) {
        page.drawRectangle({
          x: box.x,
          y: box.y,
          width: box.w,
          height: box.h,
          borderColor: RULE,
          borderWidth: 0.4,
        });
        drawImageContain(page, box.image, {
          x: box.x + 4,
          y: box.y + 4,
          w: box.w - 8,
          h: box.h - 8,
        });
      } else {
        drawSlots(page, font, [
          { ...box, label: `${box.label} · sin imagen` },
        ]);
      }
    }
    return;
  }

  if (productPage.kind === "sizeSpec") {
    const box = { x: innerX, y: innerBottom, w: innerW, h: innerH };
    if (images[0]) {
      drawImageContain(page, images[0], box);
    } else {
      drawSlots(page, font, [
        {
          ...box,
          label: `Size Spec · 1 imagen · ${filled}/1`,
        },
      ]);
    }
    return;
  }

  const placed = images.filter((image): image is PDFImage => Boolean(image));
  if (!placed.length) {
    drawSlots(page, font, [
      {
        x: innerX,
        y: innerBottom,
        w: innerW,
        h: innerH,
        label: `Collage · ${filled} imágenes`,
      },
    ]);
    return;
  }

  const gap = 6;
  const { cols, rows } = collageGrid(placed.length);
  const cellW = (innerW - gap * (cols - 1)) / cols;
  const cellH = (innerH - gap * (rows - 1)) / rows;
  placed.forEach((image, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    drawImageContain(page, image, {
      x: innerX + col * (cellW + gap),
      y: innerBottom + (rows - 1 - row) * (cellH + gap),
      w: cellW,
      h: cellH,
    });
  });
}

export async function buildProductPdf(product: Product): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const coverImages: Partial<Record<CoverImageKey, PDFImage | null>> = {};
  for (const key of COVER_IMAGE_KEYS) {
    coverImages[key] = await embedSlot(pdf, product.cover.images[key]);
  }

  const cover = pdf.addPage(PageSizes.A4);
  drawCoverPage(cover, font, bold, product, coverImages);

  const pages = [...(product.pages ?? [])].sort((a, b) => a.order - b.order);
  for (const productPage of pages) {
    const sheet = pdf.addPage(PageSizes.A4);
    const canvas = drawChrome(
      sheet,
      font,
      bold,
      product,
      productPage.title || pageKindLabel(productPage.kind),
    );
    const embedded = await Promise.all(
      (productPage.images ?? []).map((slot) => embedSlot(pdf, slot)),
    );
    drawPageBody(sheet, font, productPage, canvas, embedded);
  }

  pdf.setTitle(`Ficha ${product.style}`);
  pdf.setSubject(product.shortDescription);
  pdf.setCreator("Xtyle");

  return pdf.save();
}

export function productPdfFileName(product: Product): string {
  const style = product.style
    .trim()
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `ficha-${style || "producto"}-v${product.version}.pdf`;
}
