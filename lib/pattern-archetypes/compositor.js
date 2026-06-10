/**
 * Resolve coordinated RhythmPlan per pattern / section.
 */

const { deriveSeed, seededRandom } = require('../rng');
const { selectArchetypeBundle } = require('./selector');
const { renderHatMaps, mapToCells } = require('./render');
const { applyPatternEvolution } = require('./evolver');
const { resolveLegacyEnergy, resolveLegacySectionName, legacySectionBars } = require('./legacy');
const { LEGACY_BASS_STYLE_MAP } = require('./registry');
const { energyToGeneratorOptions } = require('../composition/energy-curve');

const sectionBundleCache = new Map();

function cacheKey(seedVal, sectionName) {
  return `${seedVal}:${sectionName}`;
}

function resolveSectionContext(ctx, resolved, patternIndex) {
  const { patternCount, arrangementId, seedVal } = resolved;
  let sectionName = 'Unknown';
  let energy = 50;
  let flags = {};
  let globalBar = patternIndex * (ctx.bpp || 4);
  let barInSection = 0;
  let sectionBars = 16;
  let sectionStartBar = 0;

  if (ctx.barBased) {
    const section = ctx.getPatternSection(patternIndex);
    sectionName = section.name;
    energy = section.energy ?? 50;
    flags = section.flags || {};
    globalBar = ctx.globalBarForPattern(patternIndex);

    if (ctx.barTimeline) {
      for (const s of ctx.barTimeline.sections) {
        if (globalBar >= s.startBar && globalBar < s.endBar) {
          sectionStartBar = s.startBar;
          sectionBars = s.endBar - s.startBar;
          barInSection = globalBar - s.startBar;
          break;
        }
      }
    }
  } else {
    const legacy = ctx.getPatternSection
      ? ctx.getPatternSection(patternIndex)
      : null;
    if (legacy) {
      sectionName = legacy.name || resolveLegacySectionName(arrangementId, patternIndex, patternCount);
      energy = resolveLegacyEnergy(legacy, patternIndex, patternCount);
    } else {
      sectionName = resolveLegacySectionName(arrangementId, patternIndex, patternCount);
      energy = resolveLegacyEnergy(
        { tracks: { hihat: 0.5 } },
        patternIndex,
        patternCount
      );
    }
    globalBar = patternIndex * (ctx.bpp || 4);
    barInSection = patternIndex;
    sectionBars = legacySectionBars(patternCount, ctx.bpp || 4);
  }

  return {
    sectionName,
    energy,
    flags,
    globalBar,
    barInSection,
    sectionBars,
    sectionStartBar,
    seedVal
  };
}

/**
 * Select archetype bundle (cached per section for consistency).
 */
function resolveArchetypeBundle(ctx, resolved, patternIndex) {
  const sec = resolveSectionContext(ctx, resolved, patternIndex);
  const styleId = ctx.style?.id || resolved.arrangementId;
  const key = cacheKey(sec.seedVal, sec.sectionName);

  if (!sectionBundleCache.has(key)) {
    const rng = seededRandom(deriveSeed(sec.seedVal, 'rhythm-bundle', sec.sectionName));
    const bundle = selectArchetypeBundle({
      energy: sec.energy,
      sectionName: sec.sectionName,
      styleId,
      barInSection: sec.barInSection,
      sectionBars: sec.sectionBars,
      rng
    });
    sectionBundleCache.set(key, bundle);
  }

  return { bundle: sectionBundleCache.get(key), ...sec };
}

function clearSectionBundleCache() {
  sectionBundleCache.clear();
}

/**
 * Full rhythm plan for one pattern.
 */
function resolveRhythmPlan(ctx, resolved, patternIndex, options = {}) {
  const { bundle, sectionName, energy, flags, globalBar, barInSection, sectionBars, seedVal } =
    resolveArchetypeBundle(ctx, resolved, patternIndex);

  const style = ctx.style;
  const genOpts = energyToGeneratorOptions(energy, style, 'hihat', {
    flags,
    barInSection,
    sectionBars,
    bpp: ctx.bpp
  });

  const variationRange = style?.hatVariationRate;
  const e = energy / 100;
  const variationRate = Array.isArray(variationRange)
    ? variationRange[0] + (variationRange[1] - variationRange[0]) * e
    : 0.2 + e * 0.2;

  return {
    energy,
    sectionName,
    globalBar,
    barInSection,
    sectionBars,
    flags,
    seedVal,
    archetypes: { ...bundle },
    evolution: {
      variationRate,
      blockBars: 4,
      fillP: genOpts.fillP ?? 30
    },
    options: genOpts,
    lpb: ctx.lpb,
    linesPerPattern: ctx.linesPerPattern,
    styleId: style?.id || resolved.arrangementId,
    bassStyle: resolved.bassStyle
  };
}

function generateArchetypeHats(trackLength, lpb, rng, rhythmPlan, fingerprintCache) {
  const ids = rhythmPlan.archetypes.hat || [];
  if (!ids.length) return Array(trackLength).fill('');

  const map = renderHatMaps(ids, trackLength, lpb);
  let cells = mapToCells(map, trackLength);

  cells = applyPatternEvolution(
    cells,
    rhythmPlan,
    lpb,
    trackLength,
    rng,
    fingerprintCache,
    { fillP: rhythmPlan.evolution?.fillP, allowFill: true }
  );

  return cells;
}

function getLeadRhythmArchetypeId(rhythmPlan, phraseSlot) {
  const ids = rhythmPlan.archetypes.leadRhythm || [];
  const energy = rhythmPlan.energy ?? 50;

  if (phraseSlot === 'B' && energy >= 50) {
    if (ids.includes('L5')) return 'L5';
    if (ids.includes('L2')) return 'L2';
    return ids[0] || 'L5';
  }
  if ((phraseSlot === 'A' || phraseSlot === "A'") && energy >= 50) {
    if (ids.includes('L4')) return 'L4';
    return ids[0] || 'L4';
  }
  if (phraseSlot === 'C' && ids.includes('L3')) return 'L3';
  if (!ids.length) return energy < 25 ? 'L1' : 'L1';
  return ids[0];
}

function getBassArchetypeId(rhythmPlan) {
  const ids = rhythmPlan.archetypes.bass || [];
  if (ids.length) return ids[0];
  return LEGACY_BASS_STYLE_MAP[rhythmPlan.bassStyle] || 'B1';
}

function getClapArchetypeIds(rhythmPlan) {
  return rhythmPlan.archetypes.clap || ['C1'];
}

function getPercArchetypeIds(rhythmPlan) {
  return rhythmPlan.archetypes.perc || [];
}

module.exports = {
  resolveRhythmPlan,
  resolveSectionContext,
  resolveArchetypeBundle,
  clearSectionBundleCache,
  generateArchetypeHats,
  getLeadRhythmArchetypeId,
  getBassArchetypeId,
  getClapArchetypeIds,
  getPercArchetypeIds
};
