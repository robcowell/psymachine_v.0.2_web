/**
 * Legacy arrangement helpers for pseudo-energy and section naming.
 */

const { getPatternArrangement } = require('../arrangement-pattern');

function resolveLegacyEnergy(section, patternIndex, patternCount) {
  const progress = (patternIndex + 0.5) / Math.max(1, patternCount);
  const hihatDensity = section.tracks?.hihat ?? 0.5;
  const energy = Math.round(progress * 50 + hihatDensity * 50);
  return Math.max(0, Math.min(100, energy));
}

function resolveLegacySectionName(arrangementId, patternIndex, patternCount) {
  const legacy = getPatternArrangement(arrangementId, patternIndex, patternCount);
  return legacy?.name || 'Unknown';
}

function legacySectionBars(patternCount, bpp) {
  return Math.max(4, patternCount * bpp);
}

module.exports = {
  resolveLegacyEnergy,
  resolveLegacySectionName,
  legacySectionBars
};
