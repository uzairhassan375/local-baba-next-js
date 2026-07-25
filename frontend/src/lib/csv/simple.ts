/** Parse CSV text into rows. Handles commas inside double quotes and \r\n. */
export function parseSimpleCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === "\"") {
        if (text[i + 1] === "\"") {
          cur += "\"";
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === "\"") {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cur);
      cur = "";
    } else if (c === "\n" || c === "\r") {
      row.push(cur);
      cur = "";
      if (row.some(cell => cell.trim() !== "") || rows.length === 0) {
        rows.push(row);
      }
      row = [];
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += c;
    }
  }
  row.push(cur);
  if (row.some(cell => cell.trim() !== "") || rows.length === 0) {
    rows.push(row);
  }
  return rows;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export type StockPriceRow = { sku: string; stock: number; price_per_pc: number };

const STOCK_HEADERS = new Set(["quantity", "qty", "stock", "stock_qty", "stock_quantity", "units", "on_hand"]);
const PRICE_HEADERS = new Set([
  "price",
  "price_per_pc",
  "price_per_piece",
  "unit_price",
  "selling_price",
  "price_pc",
]);
const SKU_HEADERS = new Set(["sku", "product_sku", "sku_code", "item_sku"]);

function parseMoneyOrNumber(s: string): number | null {
  const t = s.replace(/,/g, "").replace(/^\s*rs\.?\s*/i, "").replace(/^\s*pkr\s*/i, "").trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function parseStockPriceCsv(text: string): {
  rows: StockPriceRow[];
  errors: string[];
} {
  const errors: string[] = [];
  const raw = parseSimpleCsv(text.replace(/^\uFEFF/, ""));
  if (raw.length < 2) {
    errors.push("CSV needs a header row and at least one data row.");
    return { rows: [], errors };
  }

  const headerCells = raw[0]!.map(normalizeHeader);
  let skuCol = -1;
  let stockCol = -1;
  let priceCol = -1;

  headerCells.forEach((h, i) => {
    if (SKU_HEADERS.has(h)) skuCol = i;
    if (STOCK_HEADERS.has(h)) stockCol = i;
    if (PRICE_HEADERS.has(h)) priceCol = i;
  });

  if (skuCol < 0) errors.push('Missing SKU column. Use a header named e.g. "sku".');
  if (stockCol < 0) errors.push('Missing quantity column. Use e.g. "quantity" or "stock".');
  if (priceCol < 0) errors.push('Missing price column. Use e.g. "price" or "price_per_pc".');

  if (skuCol < 0 || stockCol < 0 || priceCol < 0) {
    return { rows: [], errors };
  }

  const bySku = new Map<string, StockPriceRow>();

  for (let r = 1; r < raw.length; r++) {
    const line = raw[r]!;
    const sku = (line[skuCol] ?? "").trim();
    if (!sku) continue;

    const stockRaw = (line[stockCol] ?? "").trim();
    const priceRaw = (line[priceCol] ?? "").trim();

    const stockNum = parseMoneyOrNumber(stockRaw);
    const priceNum = parseMoneyOrNumber(priceRaw);

    if (stockNum === null || !Number.isInteger(stockNum) || stockNum < 0) {
      errors.push(`Row ${r + 1} (${sku}): invalid quantity — use a whole number ≥ 0`);
      continue;
    }
    if (priceNum === null || priceNum <= 0) {
      errors.push(`Row ${r + 1} (${sku}): invalid price — use a number greater than 0`);
      continue;
    }

    bySku.set(sku, {
      sku,
      stock: stockNum,
      price_per_pc: Math.round(priceNum * 100) / 100,
    });
  }

  return { rows: [...bySku.values()], errors };
}

/** Escape one CSV field (commas, quotes, newlines). */
export function encodeCsvCell(value: string): string {
  const needsQuotes = /[",\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

export function encodeCsv(rows: string[][]): string {
  return rows.map(row => row.map(encodeCsvCell).join(",")).join("\r\n");
}
