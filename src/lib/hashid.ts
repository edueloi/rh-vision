// Maps numeric DB IDs to short opaque URL slugs. Fully reversible.
// encodeId(7)  → e.g. "kR4"
// decodeId("kR4") → 7

const ALPHABET = 'aB3dEfGhIjKlMnOpQrStUvWxYz0C2H4J5L6N7P8R9TvVXZ1bD';
const BASE = BigInt(ALPHABET.length); // 50

// Offset added before encoding so id=1 and id=2 produce very different strings.
// Pure addition — no XOR branches that would break reversibility.
const OFFSET = 98765431n;

export function encodeId(id: number): string {
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
  return Number(n - OFFSET);
}
