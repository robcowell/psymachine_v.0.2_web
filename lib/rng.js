/**
 * Seeded RNG utilities shared across generators.
 */

function randomPercent(percent, rng) {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return (rng() * 100 | 0) + 1 <= percent;
}

function seededRandom(seed) {
  let s = Math.imul(seed, 1) || 0;
  if (s <= 0) s = (Date.now() & 0x7fffffff);
  return function () {
    s = Math.imul(48271, s) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

/** Derive a child seed from a parent seed and a string label. */
function deriveSeed(parentSeed, label) {
  let h = Math.imul(parentSeed, 1) || 0;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(31, h) + label.charCodeAt(i) | 0;
  }
  return h >>> 0;
}

module.exports = { randomPercent, seededRandom, deriveSeed };
