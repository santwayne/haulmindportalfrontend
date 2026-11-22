// Guess which CSV column fills each fuel report field.
// Exact header names win over partial matches, and each column is used once,
// so "Fuel Amount" goes to Fuel Amount (not Transaction Amount),
// "Units" (L / gal) never takes the place of "Unit" (the truck), and price
// columns ("Price Per Gallon") never fill Fuel Amount.

type FieldRule = {
  field: string;
  exact: string[];
  contains?: string[];
  exclude?: string[];
};

// Price-per-volume columns ("Price Per Gallon", "Price/Litre", "PPU") must never
// be read as the fuel quantity or the transaction total.
const PRICE_WORDS = ["price", "ppu", "ppg", "ppl", "per unit", "per gallon", "per litre", "per liter", "/gal", "/l", "rate"];

const RULES: FieldRule[] = [
  { field: "fuelAmount", exact: ["fuel amount", "fuel qty", "fuel quantity", "quantity", "qty", "volume", "litres", "liters", "gallons", "fuel volume"], contains: ["gallon", "litre", "liter", "volume", "quantity", "qty"], exclude: PRICE_WORDS },
  { field: "transactionAmount", exact: ["amount", "amt", "total amt", "transaction amount", "total", "total amount", "net amount", "cost", "total cost", "price total"], contains: ["amount", "total", "cost"], exclude: ["fuel amount", "unit cost", "cost per", ...PRICE_WORDS] },
  { field: "date", exact: ["date", "transaction date", "trans date", "purchase date", "fuel date"], contains: ["date"] },
  { field: "transactionNumber", exact: ["transaction #", "transaction number", "transaction no", "transaction id", "trx #", "receipt #", "receipt number", "invoice #", "invoice number"], contains: ["transaction", "receipt", "invoice", "trx"] },
  { field: "measurementUnit", exact: ["units", "uom", "unit of measure", "measure", "volume unit", "fuel unit"] },
  { field: "unit", exact: ["unit", "unit #", "unit number", "unit no", "truck", "truck #", "truck number", "vehicle", "vehicle #", "vehicle number", "tractor", "trailer"], contains: ["unit", "truck", "vehicle", "tractor"], exclude: ["units", "unit price", "unit of measure", "per unit"] },
  { field: "currency", exact: ["currency", "curr", "ccy", "currency code"], contains: ["currency"] },
  { field: "fuelVendor", exact: ["vendor", "fuel vendor", "station", "merchant", "location name", "truck stop"], contains: ["vendor", "station", "merchant"] },
  { field: "city", exact: ["city", "town"], contains: ["city"] },
  { field: "state", exact: ["state", "province", "state/province", "prov", "st"], contains: ["state", "province"] },
  { field: "address", exact: ["address", "location", "street"], contains: ["address"] },
  { field: "odometer", exact: ["odometer", "odo", "mileage", "kilometers", "km"], contains: ["odometer", "mileage"] },
  { field: "product", exact: ["product", "fuel type", "product type", "item", "fuel product"], contains: ["product", "fuel type"] },
];

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

export function autoMapFuelColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const used = new Set<string>();
  const normalized = headers.map((h) => ({ header: h, n: norm(h) }));

  // Pass 1: exact names
  for (const rule of RULES) {
    const hit = normalized.find((h) => !used.has(h.header) && rule.exact.includes(h.n));
    if (hit) {
      mapping[rule.field] = hit.header;
      used.add(hit.header);
    }
  }

  // Pass 2: partial names for fields still empty
  for (const rule of RULES) {
    if (mapping[rule.field] || !rule.contains) continue;
    const hit = normalized.find(
      (h) =>
        !used.has(h.header) &&
        !(rule.exclude || []).some((x) => h.n === x || h.n.includes(x)) &&
        rule.contains!.some((c) => h.n.includes(c))
    );
    if (hit) {
      mapping[rule.field] = hit.header;
      used.add(hit.header);
    }
  }

  return mapping;
}
