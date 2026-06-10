/**
 * Map arrangement sections to individual patterns in a multi-pattern song.
 */

const { getArrangement } = require('./arrangement');
const { randomPercent } = require('./rng');

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

/**
 * Apply section density for a single pattern (not line-range based).
 */
function applyPatternDensityMask(cells, trackKey, density, rng) {
  if (density == null || density >= 1) return cells;
  if (density <= 0) return cells.map(() => '');
  return cells.map(c => {
    if (!c || c === 'OFF') return c;
    return randomPercent(density * 100, rng) ? c : '';
  });
}

module.exports = {
  arrangementAtProgress,
  getPatternArrangement,
  applyPatternDensityMask
};
