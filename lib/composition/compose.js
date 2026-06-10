/**
 * Top-down composition pipeline — motif before notes.
 *
 * Track → Sections → Phrases → Motifs → Notes
 */

const { enrichBarTimeline } = require('./section-objectives');
const { generateParentMotif, deriveMotifFamily } = require('./parent-motif');
const { getSectionPlan } = require('./section-objectives');
const { getMelodyNotePool } = require('../music-theory');

/**
 * Build the full musical plan before any per-pattern note rendering.
 */
function buildCompositionPlan(params, ctx) {
  const { keyName, scaleIdx, seedVal, lpb, barTimeline, melodyPool: poolIn } = ctx;
  const melodyPool = poolIn || getMelodyNotePool(keyName, scaleIdx, params.melodyOctave || 4);
  const rng = ctx.rng;

  const timeline = enrichBarTimeline(barTimeline);
  const parentMotif = generateParentMotif(melodyPool, seedVal, lpb, rng);
  const motifFamily = deriveMotifFamily(parentMotif, seedVal, lpb);

  const sectionPlans = (timeline?.sections || []).map(s => ({
    name: s.name,
    startBar: s.startBar,
    endBar: s.endBar,
    energy: s.energy,
    flags: s.flags,
    ...getSectionPlan(s)
  }));

  return {
    parentMotif,
    motifFamily,
    sectionPlans,
    timeline,
    melodyPool,
    pitchSequence: parentMotif.noteTokens.join(' ')
  };
}

function findSectionPlan(composition, patternIndex, bpp) {
  if (!composition?.sectionPlans?.length) return null;
  const bar = patternIndex * bpp + bpp * 0.5;
  for (const s of composition.sectionPlans) {
    if (bar >= s.startBar && bar < s.endBar) return s;
  }
  return composition.sectionPlans[composition.sectionPlans.length - 1];
}

module.exports = {
  buildCompositionPlan,
  findSectionPlan
};
