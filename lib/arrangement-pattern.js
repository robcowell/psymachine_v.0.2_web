/**
 * Map arrangement sections to individual patterns in a multi-pattern song.
 */

const { getArrangement } = require('./arrangement');

/**
 * Pick fully-on bar indices — evenly spaced, seeded phase offset per track.
 */
function pickActiveBars(barCount, density, rng) {
  if (density >= 1) return Array(barCount).fill(true);
  if (density <= 0) return Array(barCount).fill(false);

  const activeCount = Math.max(1, Math.min(barCount, Math.round(barCount * density)));
  if (activeCount >= barCount) return Array(barCount).fill(true);

  const active = Array(barCount).fill(false);
  const stride = barCount / activeCount;
  const phase = Math.floor(rng() * Math.max(1, stride));
  for (let i = 0; i < activeCount; i++) {
    const bar = Math.min(barCount - 1, Math.floor(phase + i * stride));
    active[bar] = true;
  }
  return active;
}

/**
 * Gate whole bars on/off — avoids per-note thinning (channel-unmute feel).
 * @param {number} [startLine=0] — line offset in cells where bar 0 begins
 * @param {number} [barCount] — bars to gate (default: from cells length)
 */
function applyBarBlockGate(cells, density, barLines, rng, startLine = 0, barCount = null) {
  if (density == null || density >= 1) return cells;
  if (density <= 0) return cells.map(() => '');

  const available = cells.length - startLine;
  const totalBars = barCount ?? Math.max(1, Math.ceil(available / barLines));
  const active = pickActiveBars(totalBars, density, rng);
  const out = cells.slice();

  for (let b = 0; b < totalBars; b++) {
    if (active[b]) continue;
    const lineStart = startLine + b * barLines;
    const lineEnd = Math.min(lineStart + barLines, out.length);
    if (lineStart >= out.length) break;
    for (let i = lineStart; i < lineEnd; i++) {
      if (out[i] && out[i] !== 'OFF') out[i] = '';
    }
  }
  return out;
}

/**
 * Apply section density for a single pattern via bar-block gating.
 */
function applyPatternDensityMask(cells, trackKey, density, rng, options = {}) {
  const lpb = options.lpb ?? 4;
  const barLines = lpb * 4;
  return applyBarBlockGate(cells, density, barLines, rng);
}

function arrangementAtProgress(arrangementId, progress) {
  const arr = getArrangement(arrangementId);
  const p = Math.max(0, Math.min(0.999999, progress));
  for (const section of arr.sections) {
    if (p >= section.start && p < section.end) {
      return { name: section.name, tracks: section.tracks };
    }
  }
  const last = arr.sections[arr.sections.length - 1];
  return last ? { name: last.name, tracks: last.tracks } : { name: 'Loop', tracks: {} };
}

function getPatternArrangement(arrangementId, patternIndex, patternCount) {
  const progress = (patternIndex + 0.5) / Math.max(1, patternCount);
  return arrangementAtProgress(arrangementId, progress);
}

module.exports = {
  arrangementAtProgress,
  getPatternArrangement,
  applyPatternDensityMask,
  applyBarBlockGate,
  pickActiveBars
};
