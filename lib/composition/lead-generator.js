/**
 * Lead generation from parent motif family — phrases before notes, never random walks.
 */

const { renderPhraseStructure } = require('./phrase-structure');
const { findSectionPlan } = require('./compose');
const { phaseToVariant } = require('./parent-motif');

function emptyCells(len) {
  return Array(len).fill('');
}

function selectPhraseSlots(section, energy) {
  if (section?.phraseSlots?.length) return section.phraseSlots;
  if (energy >= 90) return ['A', 'A', 'B', "A'"];
  return ['A', "A'", 'B', 'A'];
}

function generateLeadMain(ctx, patternIndex, trackLength, lpb) {
  const composition = ctx.composition;
  const section = ctx.getPatternSection(patternIndex);
  const energy = section?.energy ?? 50;
  const plan = findSectionPlan(composition, patternIndex, ctx.bpp) || section;
  const phraseSlots = selectPhraseSlots(plan, energy);

  let motifFamily = { ...composition.motifFamily };
  const mainMotif = composition.parentMotif.cells;

  if (energy >= 95) {
    motifFamily.A = motifFamily.sequence || motifFamily.A;
  } else if (plan?.motifPhase) {
    const variantKey = phaseToVariant(plan.motifPhase);
    if (motifFamily[variantKey]) motifFamily.A = motifFamily[variantKey];
  } else {
    motifFamily.A = mainMotif;
  }

  return renderPhraseStructure(phraseSlots, motifFamily, mainMotif, trackLength, lpb);
}

/**
 * @param {'lead'|'lead2'} role — lead = main voice, lead2 = fills gaps with counterpoint
 */
function generateLeadTrack(ctx, patternIndex, trackLength, lpb, role) {
  const composition = ctx.composition;
  if (!composition?.parentMotif || !composition.motifFamily) {
    return emptyCells(trackLength);
  }

  const section = ctx.getPatternSection(patternIndex);
  const energy = section?.energy ?? 50;

  if (role === 'lead2') {
    if (energy < 30) return emptyCells(trackLength);
    const counter = composition.motifFamily.counterpoint
      || composition.motifFamily.counter;
    if (!counter) return emptyCells(trackLength);

    const leadMain = generateLeadMain(ctx, patternIndex, trackLength, lpb);
    const counterNotes = counter.filter(c => c && c !== 'OFF');
    const out = emptyCells(trackLength);
    if (!counterNotes.length) return out;

    const gaps = [];
    for (let i = 0; i < trackLength; i++) {
      if (!leadMain[i]) gaps.push(i);
    }
    const step = energy >= 70 ? 2 : 3;
    for (let g = 0; g < gaps.length; g += step) {
      out[gaps[g]] = counterNotes[(g / step | 0) % counterNotes.length];
    }
    return out;
  }

  return generateLeadMain(ctx, patternIndex, trackLength, lpb);
}

module.exports = {
  generateLeadTrack
};
