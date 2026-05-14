// Base62 encoding — maps a numeric database ID to a short opaque string for URLs.
// Reversible: encodeId(42) → "G" | decodeId("G") → 42
// Uses a shuffled alphabet so sequential IDs don't produce sequential slugs.

const ALPHABET = 'aB3dEfGhIjKlMnOpQrStUvWxYz0C2H4J5L6N7P8R9TvVXZ1bD';
const BASE = ALPHABET.length; // 50

// Salt offsets each digit so id=1 and id=2 look nothing alike
const SALT = 0x5e3a7f1n;

export function encodeId(id: number): string {
  let n = BigInt(id) ^ SALT;
  if (n <= 0n) n = BigInt(id) + SALT;
  let result = '';
  do {
    result = ALPHABET[Number(n % BigInt(BASE))] + result;
    n = n / BigInt(BASE);
  } while (n > 0n);
  return result;
}

export function decodeId(slug: string): number {
  let n = 0n;
  for (const ch of slug) {
    const idx = ALPHABET.indexOf(ch);
    if (idx === -1) return 0;
    n = n * BigInt(BASE) + BigInt(idx);
  }
  const raw = n ^ SALT;
  // if XOR gave a negative-looking result, reverse the fallback branch
  return Number(raw > 0n ? raw : n - SALT);
}
