/**
 * Composition context — shared top-down state for the generation pipeline.
 */

const { seededRandom } = require('../rng');
const { patternCountFromMinutes, songDurationSeconds, formatDuration } = require('../song-duration');
const {
  getStyleProfile,
  isBarBasedStyle,
  pickBpm,
  pickKey,
  pickScaleIndex
} = require('./style-profiles');
const {
  buildBarTimeline,
  getSectionForPattern,
  patternCountFromTimeline,
  barsPerPattern
} = require('./arrangement-bars');
const {
  energyToTrackDensities,
  energyToLeadPercents,
  energyToGeneratorOptions
} = require('./energy-curve');
const { buildChordTimeline } = require('./chord-engine');
const { getMelodyNotePool } = require('../music-theory');
const { buildCompositionPlan, findSectionPlan } = require('./compose');
const { getSectionPlan, resolveSectionObjective } = require('./section-objectives');

const LEGACY_ARRANGEMENTS = new Set(['classic', 'minimal', 'loop']);
const RENOISE_LPB = 4;

function createCompositionContext(params) {
  const linesPerPattern = parseInt(params.linesPerPattern ?? params.trackLen, 10) || 64;
  const arrangementIdEarly = params.arrangement || 'progressive';
  const barBasedEarly = isBarBasedStyle(arrangementIdEarly) && !LEGACY_ARRANGEMENTS.has(arrangementIdEarly);
  let lpb = parseInt(params.lpb ?? params.ticksPerBeat, 10) || RENOISE_LPB;
  if (barBasedEarly) lpb = RENOISE_LPB;
  const seedVal = parseInt(params.seed, 10) || 0;
  const rng = seededRandom(seedVal);
  const arrangementId = params.arrangement || 'progressive';
  const style = getStyleProfile(arrangementId) || getStyleProfile(params.style);
  const barBased = isBarBasedStyle(arrangementId) && !LEGACY_ARRANGEMENTS.has(arrangementId);

  const useStyleDefaults = params.useStyleDefaults !== false && style != null;

  let bpm = parseInt(params.bpm, 10);
  if (!Number.isFinite(bpm)) {
    bpm = style ? pickBpm(style, rng) : 145;
  }

  let keyName = params.scaleKey || 'E';
  let scaleIdx = params.scaleMode != null ? params.scaleMode : '12';
  if (params.autoKey === true && style) {
    keyName = pickKey(style, rng);
    scaleIdx = String(pickScaleIndex(style, rng));
  }

  let bassStyle = params.bassStyle;
  if ((!bassStyle || bassStyle === 'rolling') && useStyleDefaults && style) {
    bassStyle = style.bassStyle;
  }
  bassStyle = bassStyle || 'rolling';

  const bpp = barsPerPattern(linesPerPattern, lpb);
  let barTimeline = null;
  let patternCount = parseInt(params.patternCount, 10);

  if (barBased) {
    barTimeline = buildBarTimeline(arrangementId, seedVal);
    if (!Number.isFinite(patternCount) || patternCount < 1) {
      patternCount = patternCountFromTimeline(barTimeline, linesPerPattern, lpb);
    }
  } else if (!Number.isFinite(patternCount) || patternCount < 1) {
    const minutes = parseFloat(params.songMinutes) || 4;
    patternCount = patternCountFromMinutes(minutes, linesPerPattern, lpb, bpm);
  }

  patternCount = Math.max(1, Math.min(256, patternCount));

  const durationSeconds = songDurationSeconds(patternCount, linesPerPattern, lpb, bpm);
  const melodyPool = getMelodyNotePool(keyName, scaleIdx, params.melodyOctave || 4);

  const ctxStub = {
    seedVal,
    rng,
    linesPerPattern,
    lpb,
    bpm,
    bpp,
    patternCount,
    arrangementId,
    style,
    barBased,
    barTimeline,
    keyName,
    scaleIdx,
    bassStyle,
    melodyPool
  };

  const composition = barBased ? buildCompositionPlan(params, ctxStub) : null;
  const chordTimeline = barBased ? buildChordTimeline(composition?.timeline || barTimeline, keyName, scaleIdx) : null;

  function getPatternSection(patternIndex) {
    if (barTimeline) {
      const section = getSectionForPattern(barTimeline, patternIndex, linesPerPattern, lpb);
      if (!section) {
        return {
          name: 'Unknown',
          energy: 50,
          tracks: energyToTrackDensities(50),
          flags: {},
          ...resolveSectionObjective('Unknown')
        };
      }
      const objectives = resolveSectionObjective(section.name);
      const plan = findSectionPlan(composition, patternIndex, bpp);
      return {
        name: section.name,
        energy: section.energy,
        tracks: energyToTrackDensities(section.energy, section.flags),
        flags: section.flags,
        objective: plan?.objective || objectives.objective,
        motifPhase: plan?.motifPhase || objectives.motifPhase,
        phraseSlots: plan?.phraseSlots || getSectionPlan({ ...objectives }).phraseSlots
      };
    }
    return null;
  }

  function getLeadPercentsForPattern(patternIndex) {
    const section = getPatternSection(patternIndex);
    const energy = section?.energy ?? 50;
    return energyToLeadPercents(energy, style);
  }

  function getGeneratorOptions(trackKey, patternIndex) {
    const section = getPatternSection(patternIndex);
    const energy = section?.energy ?? 50;
    return energyToGeneratorOptions(energy, style, trackKey);
  }

  function globalBarForPattern(patternIndex) {
    return patternIndex * bpp;
  }

  return {
    seedVal,
    rng,
    linesPerPattern,
    lpb,
    bpm,
    bpp,
    patternCount,
    arrangementId,
    style,
    barBased,
    barTimeline,
    keyName,
    scaleIdx,
    bassStyle,
    useStyleDefaults,
    durationSeconds,
    durationFormatted: formatDuration(durationSeconds),
    songName: params.songName || `Psymachine ${keyName} Song`,
    composition,
    parentMotif: composition?.parentMotif || null,
    motifFamily: composition?.motifFamily || null,
    getPatternSection,
    getLeadPercentsForPattern,
    getGeneratorOptions,
    globalBarForPattern,
    chordTimeline,
    melodyPool,
    isBarBased: () => barBased
  };
}

module.exports = {
  createCompositionContext,
  LEGACY_ARRANGEMENTS
};
