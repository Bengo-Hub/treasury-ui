/**
 * Spotting a vendor that is really the business itself (same KRA PIN, or the same name once
 * legal suffixes and punctuation are ignored). Used to warn, never to block: a branch billing
 * its head office is a legitimate case.
 */

// Legal-form words, stripped only from the end ("Co-op Bank" keeps its "co").
const TRAILING_SUFFIXES = /(\s(limited|ltd|plc|llc|inc|incorporated|company|co))+$/;

export function normaliseBusinessName(name: string): string {
  const flat = name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return flat.replace(TRAILING_SUFFIXES, '').trim();
}

/** Why a vendor looks like the business itself, or null when it does not. */
export function selfVendorReason(
  vendor: { name?: string; taxPin?: string },
  own: { name?: string; taxPin?: string } | null | undefined,
): string | null {
  if (!own) return null;
  const pin = (vendor.taxPin ?? '').trim().toUpperCase();
  const ownPin = (own.taxPin ?? '').trim().toUpperCase();
  if (pin && ownPin && pin === ownPin) return `its KRA PIN ${pin} is your own business's`;
  const a = normaliseBusinessName(vendor.name ?? '');
  const b = normaliseBusinessName(own.name ?? '');
  if (a && b && a === b) return `"${vendor.name?.trim()}" is your own business's name`;
  return null;
}
