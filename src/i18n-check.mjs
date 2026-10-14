// Every language file must have exactly the shape of the reference (en): same keys, same array
// lengths, no empty strings, and the same {placeholders}. Returns a list of problems (empty = OK).
const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

function compare(ref, other, path, out) {
  if (Array.isArray(ref)) {
    if (!Array.isArray(other)) return out.push(`${path}: expected a list`);
    if (other.length !== ref.length) out.push(`${path}: ${other.length} items, en has ${ref.length}`);
    ref.forEach((r, i) => i < other.length && compare(r, other[i], `${path}[${i}]`, out));
    return;
  }
  if (ref && typeof ref === 'object') {
    if (!other || typeof other !== 'object' || Array.isArray(other)) return out.push(`${path}: expected an object`);
    for (const k of Object.keys(ref)) {
      if (!(k in other)) out.push(`${path}.${k}: missing`);
      else compare(ref[k], other[k], `${path}.${k}`, out);
    }
    for (const k of Object.keys(other)) if (!(k in ref)) out.push(`${path}.${k}: not in en`);
    return;
  }
  if (typeof other !== 'string' || other.trim() === '') return out.push(`${path}: empty`);
  if (placeholders(ref) !== placeholders(other)) out.push(`${path}: placeholders {${placeholders(other)}} differ from en {${placeholders(ref)}}`);
}

export function checkTranslations(i18n, refCode = 'en') {
  const out = [];
  for (const [code, t] of Object.entries(i18n)) if (code !== refCode) compare(i18n[refCode], t, code, out);
  return out;
}
