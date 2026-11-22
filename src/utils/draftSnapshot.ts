/**
 * Helpers for building JSON-safe draft snapshots of the create/edit forms.
 * Files can't be serialised into a draft, so they are replaced with null
 * (already-uploaded files keep their fileUrl/fileName and are unaffected).
 */
export const toDraftSafe = <T,>(value: T): T => {
  const walk = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;
    if (typeof File !== 'undefined' && v instanceof File) return null;
    if (typeof Blob !== 'undefined' && v instanceof Blob) return null;
    if (Array.isArray(v)) return v.map(walk);
    if (typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = walk(val);
      return out;
    }
    return v;
  };
  return walk(value) as T;
};
