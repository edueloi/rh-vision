// Maps numeric DB IDs to short opaque URL slugs. Fully reversible.
// encodeId(1)  → e.g. "mK7"
// decodeId("mK7") → 1
//
// ALPHABET must have NO duplicate characters — any repetition causes
// different IDs to map to the same slug (collision).

const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
// 55 unique chars (removed i, l, o, I, L, O, 0, 1 to avoid visual confusion)
const BASE = BigInt(ALPHABET.length);

// Salt offset so id=1 doesn't produce a trivially short slug.
const OFFSET = 98765431n;

export function encodeId(id: number): string {
  if (!id || id <= 0) return '';
  let n = BigInt(id) + OFFSET;
  let result = '';
  do {
    result = ALPHABET[Number(n % BASE)] + result;
    n = n / BASE;
  } while (n > 0n);
  return result;
}

export function decodeId(slug: string): number {
  if (!slug) return 0;
  let n = 0n;
  for (const ch of slug) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return 0;
    n = n * BASE + BigInt(idx);
  }
  const result = Number(n - OFFSET);
  return result > 0 ? result : 0;
}
