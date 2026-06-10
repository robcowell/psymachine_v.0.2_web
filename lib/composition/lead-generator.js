/**
 * Lead generation from parent motif family — phrases before notes, never random walks.
 */

const { renderPhraseStructure } = require('./phrase-structure');
const { findSectionPlan } = require('./compose');
const { phaseToVariant, renderMotifWithArchetypeRhythm } = require('./parent-motif');
const { getLeadRhythmArchetypeId } = require('../pattern-archetypes/compositor');
const { deriveSeed, seededRandom } = require('../rng');
const { isBreakdown } = require('./breakdown');
const { alignCellsToChordTimeline, collapseToChordRoots } = require('./harmonic-alignment');

function emptyCells(len) {
  return Array(len).fill('');
}

function harmonizeLead(ctx, patternIndex, cells, lpb) {
  if (!ctx.chordTimeline) return cells;
  const globalBar = ctx.globalBarForPattern(patternIndex);
  return alignCellsToChordTimeline(cells, ctx.chordTimeline, globalBar, lpb);
}

function selectPhraseSlots(section, energy) {
  if (section?.phraseSlots?.length) return section.phraseSlots;
  if (energy >= 90) return ['A', 'A', 'B', "A'"];
  return ['A', "A'", 'B', 'A'];
}

function isCallResponseSection(section) {
  return /theme a|theme b/i.test(section?.name || '');
}

const SPARSE_MOTIF_PHASES = new Set(['sparse', 'atmospheric', 'halftime', 'simplified']);

function applyMotifPhaseOverlay(motifFamily, composition, plan, energy) {
  if (energy >= 95) {
    motifFamily.A = motifFamily.sequence || motifFamily.A;
    return motifFamily;
  }
  if (!plan?.motifPhase || !SPARSE_MOTIF_PHASES.has(plan.motifPhase)) {
    return motifFamily;
  }
  const variantKey = phaseToVariant(plan.motifPhase);
  if (composition.motifFamily[variantKey]) {
    motifFamily.A = composition.motifFamily[variantKey];
  }
  return motifFamily;
}

function buildArchetypeMotifFamily(composition, rhythmPlan, lpb, energy, plan) {
  const parent = composition.parentMotif;
  const rng = seededRandom(deriveSeed(rhythmPlan.seedVal, 'lead-rhythm', rhythmPlan.globalBar));
  let motifFamily = { ...composition.motifFamily };

  const slots = ['A', "A'", 'B', "A''", 'C'];
  for (const slot of slots) {
    const archId = getLeadRhythmArchetypeId(rhythmPlan, slot);
    motifFamily[slot] = renderMotifWithArchetypeRhythm(parent, archId, lpb, rng);
  }

  return applyMotifPhaseOverlay(motifFamily, composition, plan, energy);
}

function buildMotifFamilyForPattern(composition, rhythmPlan, lpb, energy, plan) {
  const mainMotif = composition.parentMotif.cells;
  if (rhythmPlan) {
    return buildArchetypeMotifFamily(composition, rhythmPlan, lpb, energy, plan);
  }
  const motifFamily = { ...composition.motifFamily };
  if (energy >= 95) {
    motifFamily.A = motifFamily.sequence || motifFamily.A;
  } else if (plan?.motifPhase && SPARSE_MOTIF_PHASES.has(plan.motifPhase)) {
    const variantKey = phaseToVariant(plan.motifPhase);
    if (motifFamily[variantKey]) motifFamily.A = motifFamily[variantKey];
  } else {
    motifFamily.A = mainMotif;
  }
  return motifFamily;
}

/** Answer voice — transposed reverse of parent (from deriveMotifFamily). */
function buildResponseMotifFamily(motifFamily, composition) {
  const response = motifFamily.response || composition.motifFamily?.response;
  if (!response) return motifFamily;
  return {
    ...motifFamily,
    A: response,
    "A'": response,
    B: motifFamily.B || response,
    "A''": response,
    C: response
  };
}

function generateLeadMain(ctx, patternIndex, trackLength, lpb) {
  const composition = ctx.composition;
  const section = ctx.getPatternSection(patternIndex);
  const energy = section?.energy ?? 50;
  const plan = findSectionPlan(composition, patternIndex, ctx.bpp) || section;
  const phraseSlots = selectPhraseSlots(plan, energy);
  const rhythmPlan = ctx.getRhythmPlan ? ctx.getRhythmPlan(patternIndex) : null;
  const mainMotif = composition.parentMotif.cells;
  const callResponse = isCallResponseSection(section);

  if (rhythmPlan && (!rhythmPlan.archetypes.leadRhythm || !rhythmPlan.archetypes.leadRhythm.length)) {
    return emptyCells(trackLength);
  }

  const motifFamily = buildMotifFamilyForPattern(composition, rhythmPlan, lpb, energy, plan);
  const phraseOpts = callResponse ? { phraseRole: 'question' } : {};

  let cells = renderPhraseStructure(phraseSlots, motifFamily, mainMotif, trackLength, lpb, phraseOpts);
  if (isBreakdown(section.flags)) {
    cells = ctx.chordTimeline
      ? collapseToChordRoots(cells, ctx.chordTimeline, ctx.globalBarForPattern(patternIndex), lpb)
      : cells;
  } else {
    cells = harmonizeLead(ctx, patternIndex, cells, lpb);
  }
  return cells;
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

    if (isCallResponseSection(section)) {
      const plan = findSectionPlan(composition, patternIndex, ctx.bpp) || section;
      const phraseSlots = selectPhraseSlots(plan, energy);
      const rhythmPlan = ctx.getRhythmPlan ? ctx.getRhythmPlan(patternIndex) : null;
      if (rhythmPlan && (!rhythmPlan.archetypes.leadRhythm || !rhythmPlan.archetypes.leadRhythm.length)) {
        return emptyCells(trackLength);
      }
      const motifFamily = buildMotifFamilyForPattern(composition, rhythmPlan, lpb, energy, plan);
      const responseFamily = buildResponseMotifFamily(motifFamily, composition);
      const response = renderPhraseStructure(
        phraseSlots,
        responseFamily,
        composition.parentMotif.cells,
        trackLength,
        lpb,
        { phraseRole: 'answer' }
      );
      return harmonizeLead(ctx, patternIndex, response, lpb);
    }

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
    return harmonizeLead(ctx, patternIndex, out, lpb);
  }

  return generateLeadMain(ctx, patternIndex, trackLength, lpb);
}

module.exports = {
  generateLeadTrack
};
