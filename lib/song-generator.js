/**
 * Full song generator — multi-pattern tracks with composition pipeline (Phase 1).
 */

const { generateMelodyCells } = require('./generator');
const { generateBass, defaultRootChangeEveryBars } = require('./bass-generator');
const { generateKick, generateSnareClap, generateHiHats, generatePercussion } = require('./drum-generator');
const { clearSectionBundleCache } = require('./pattern-archetypes/compositor');
const { generateFX, generateFXSparse } = require('./fx-generator');
const { getSectionTimeline, listArrangements } = require('./arrangement');
const { getPatternArrangement, applyPatternDensityMask } = require('./arrangement-pattern');
const { getMelodyNotePool, getBassNotePool } = require('./music-theory');
const { buildMultiTrackXml } = require('./renoise-xml');
const { buildXrns } = require('./xrns/builder');
const { countNotesInTrack } = require('./xrns/note-cells');
const { seededRandom, deriveSeed } = require('./rng');
const { createCompositionContext } = require('./composition');
const { getBarSectionTimeline } = require('./composition/arrangement-bars');
const { energyToTrackDensities } = require('./composition/energy-curve');
const { generateLeadTrack } = require('./composition/lead-generator');
const { generatePad } = require('./composition/pad-generator');
const {
  applyInstrumentSlotsToTracks,
  buildInstrumentNameMap,
  MAX_INSTRUMENT_SLOT
} = require('./instrument-presets');

const DEFAULT_LEAD_PERCENTS = {
  baseNoteP: 40,
  otherNotesP: 50,
  removeNoteP: 5,
  addNoteP: 20,
  changeNoteP: 20,
  noteOffP: 40,
  noteOffVariationP: 20,
  noteFlutterP: 20
};

function pct(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
}

const DEFAULT_TRACKS = {
  lead: { enabled: true, instrument: '0', label: 'Lead / Melody' },
  lead2: { enabled: true, instrument: '7', label: 'Counter Lead' },
  pad: { enabled: true, instrument: '8', label: 'Pad' },
  bass: { enabled: true, instrument: '1', label: 'Bass', style: 'rolling' },
  kick: { enabled: true, instrument: '2', label: 'Kick' },
  snare: { enabled: true, instrument: '3', label: 'Snare / Clap' },
  hihat: { enabled: true, instrument: '4', label: 'Hi-Hats' },
  fx: { enabled: true, instrument: '5', label: 'FX' },
  perc: { enabled: false, instrument: '6', label: 'Perc / Crash' }
};

const TRACK_KEYS = ['lead', 'lead2', 'pad', 'bass', 'kick', 'snare', 'hihat', 'fx', 'perc'];

function emptyPadFallback(len) {
  return Array(len).fill('');
}

function resolveSongParams(params) {
  const ctx = createCompositionContext(params);
  return {
    linesPerPattern: ctx.linesPerPattern,
    lpb: ctx.lpb,
    bpm: ctx.bpm,
    patternCount: ctx.patternCount,
    seedVal: ctx.seedVal,
    arrangementId: ctx.arrangementId,
    keyName: ctx.keyName,
    scaleIdx: ctx.scaleIdx,
    bassStyle: ctx.bassStyle,
    tracksConfig: applyInstrumentSlotsToTracks({ ...DEFAULT_TRACKS, ...(params.tracks || {}) }),
    songName: ctx.songName,
    durationSeconds: ctx.durationSeconds,
    durationFormatted: ctx.durationFormatted,
    ctx
  };
}

function getSectionForPattern(ctx, resolved, patternIndex) {
  if (ctx.barBased) {
    return ctx.getPatternSection(patternIndex);
  }
  const legacy = getPatternArrangement(resolved.arrangementId, patternIndex, resolved.patternCount);
  return {
    name: legacy.name,
    energy: null,
    tracks: legacy.tracks,
    flags: {}
  };
}

function generateTrackCellsForPattern(params, resolved, ctx, trackKey, patternIndex, melodyPool, bassPool, hatFingerprintCache, rhythmPlan) {
  const { linesPerPattern, lpb, seedVal, arrangementId, bassStyle, tracksConfig, patternCount } = resolved;
  const patternSeed = deriveSeed(seedVal, `p${patternIndex}`);
  const section = getSectionForPattern(ctx, resolved, patternIndex);
  const plan = rhythmPlan || (ctx.getRhythmPlan ? ctx.getRhythmPlan(patternIndex) : null);

  function mask(cells, key) {
    const density = section.tracks[key];
    if (density == null || density >= 1) return cells;
    if (density <= 0) return cells.map(() => '');
    return applyPatternDensityMask(
      cells,
      key,
      density,
      seededRandom(deriveSeed(patternSeed, `${key}-mask`)),
      { lpb }
    );
  }

  const genOpts = ctx.barBased
    ? ctx.getGeneratorOptions(trackKey, patternIndex)
    : {};

  if ((trackKey === 'lead' || trackKey === 'lead2') && tracksConfig[trackKey]?.enabled !== false) {
    if (ctx.barBased && ctx.composition?.parentMotif) {
      const role = trackKey === 'lead2' ? 'lead2' : 'lead';
      const cells = generateLeadTrack(ctx, patternIndex, linesPerPattern, lpb, role);
      return { cells: mask(cells, trackKey) };
    }
    if (trackKey === 'lead2') {
      return { cells: mask(emptyPadFallback(linesPerPattern), 'lead2') };
    }
  }

  if (trackKey === 'lead' && tracksConfig.lead?.enabled !== false && !ctx.barBased) {
    const energyLead = ctx.barBased ? ctx.getLeadPercentsForPattern(patternIndex) : null;
    const leadParams = {
      baseNote: params.baseNote || melodyPool.baseNote,
      otherNotes: params.otherNotes || melodyPool.otherNotes.join(' '),
      baseNoteP: energyLead ? energyLead.baseNoteP : pct(params.baseNoteP, DEFAULT_LEAD_PERCENTS.baseNoteP),
      otherNotesP: energyLead ? energyLead.otherNotesP : pct(params.otherNotesP, DEFAULT_LEAD_PERCENTS.otherNotesP),
      removeNoteP: energyLead ? energyLead.removeNoteP : pct(params.removeNoteP, DEFAULT_LEAD_PERCENTS.removeNoteP),
      addNoteP: energyLead ? energyLead.addNoteP : pct(params.addNoteP, DEFAULT_LEAD_PERCENTS.addNoteP),
      changeNoteP: energyLead ? energyLead.changeNoteP : pct(params.changeNoteP, DEFAULT_LEAD_PERCENTS.changeNoteP),
      noteOffP: energyLead ? energyLead.noteOffP : pct(params.noteOffP, DEFAULT_LEAD_PERCENTS.noteOffP),
      noteOffVariationP: energyLead ? energyLead.noteOffVariationP : pct(params.noteOffVariationP, DEFAULT_LEAD_PERCENTS.noteOffVariationP),
      noteFlutterP: energyLead ? energyLead.noteFlutterP : pct(params.noteFlutterP, DEFAULT_LEAD_PERCENTS.noteFlutterP),
      trackLen: linesPerPattern,
      arpeggioLen: Math.min(parseInt(params.arpeggioLen, 10) || 16, linesPerPattern),
      ticksPerBeat: lpb,
      seed: deriveSeed(patternSeed, 'lead'),
      noteOffOnBeat: params.noteOffOnBeat,
      noteOnFirstTick: params.noteOnFirstTick
    };
    const leadResult = generateMelodyCells(leadParams);
    if (leadResult.error) return leadResult;
    return { cells: mask(leadResult.cells, 'lead') };
  }

  if (trackKey === 'pad' && tracksConfig.pad?.enabled !== false) {
    if (ctx.barBased && ctx.chordTimeline) {
      const globalBar = ctx.globalBarForPattern(patternIndex);
      const cells = generatePad(
        ctx.chordTimeline,
        globalBar,
        linesPerPattern,
        lpb
      );
      return { cells: mask(cells, 'pad') };
    }
    return { cells: mask(emptyPadFallback(linesPerPattern), 'pad') };
  }

  if (trackKey === 'bass' && tracksConfig.bass?.enabled !== false) {
    const bassOpts = {
      variationP: parseInt(params.bassVariationP, 10) || 25,
      ...genOpts,
      bassStyle,
      rhythmPlan: plan,
      chordTimeline: ctx.chordTimeline || null,
      globalBar: ctx.barBased ? ctx.globalBarForPattern(patternIndex) : 0,
      rootChangeEveryBars: defaultRootChangeEveryBars(bassStyle)
    };
    const cells = generateBass(bassStyle, linesPerPattern, lpb, bassPool, seededRandom(deriveSeed(patternSeed, 'bass')), bassOpts);
    return { cells: mask(cells, 'bass') };
  }

  if (trackKey === 'kick' && tracksConfig.kick?.enabled !== false) {
    const cells = generateKick(linesPerPattern, lpb, seededRandom(deriveSeed(patternSeed, 'kick')), genOpts);
    return { cells: mask(cells, 'kick') };
  }

  if (trackKey === 'snare' && tracksConfig.snare?.enabled !== false) {
    const snareOpts = ctx.barBased
      ? { ...genOpts, useClap: params.useClap !== false, rhythmPlan: plan }
      : { useClap: params.useClap !== false, rollFillP: parseInt(params.snareRollP, 10) || 30, rhythmPlan: plan };
    const cells = generateSnareClap(linesPerPattern, lpb, seededRandom(deriveSeed(patternSeed, 'snare')), snareOpts);
    return { cells: mask(cells, 'snare') };
  }

  if (trackKey === 'hihat' && tracksConfig.hihat?.enabled !== false) {
    const hatRng = seededRandom(deriveSeed(patternSeed, 'hihat'));
    const cells = generateHiHats(linesPerPattern, lpb, hatRng, {
      rhythmPlan: plan,
      fingerprintCache: hatFingerprintCache
    });
    return { cells: mask(cells, 'hihat') };
  }

  if (trackKey === 'fx' && tracksConfig.fx?.enabled !== false) {
    const fxRng = seededRandom(deriveSeed(patternSeed, 'fx'));
    let cells;
    if (ctx.barBased) {
      cells = genOpts.sparse
        ? generateFXSparse(linesPerPattern, lpb, fxRng)
        : generateFX(linesPerPattern, lpb, fxRng, genOpts);
    } else {
      const sparse = arrangementId === 'minimal';
      cells = sparse
        ? generateFXSparse(linesPerPattern, lpb, fxRng)
        : generateFX(linesPerPattern, lpb, fxRng);
    }
    return { cells: mask(cells, 'fx') };
  }

  if (trackKey === 'perc' && tracksConfig.perc?.enabled) {
    const percOpts = { ...genOpts, rhythmPlan: plan };
    const cells = generatePercussion(linesPerPattern, lpb, seededRandom(deriveSeed(patternSeed, 'perc')), percOpts);
    return { cells: mask(cells, 'perc') };
  }

  return null;
}

function buildTrackMeta(params, resolved) {
  const { tracksConfig, keyName, scaleIdx } = resolved;
  const melodyPool = getMelodyNotePool(keyName, scaleIdx, params.melodyOctave || 4);
  const bassPool = getBassNotePool(keyName, scaleIdx);
  const trackMeta = [];

  for (const key of TRACK_KEYS) {
    const cfg = tracksConfig[key];
    if (!cfg || cfg.enabled === false) continue;
    trackMeta.push({
      key,
      name: cfg.label || DEFAULT_TRACKS[key].label,
      instrument: cfg.instrument || DEFAULT_TRACKS[key].instrument,
      instrumentHint: cfg.instrumentHint || null
    });
  }

  if (!trackMeta.length) return { error: 'Enable at least one track.' };

  return { trackMeta, melodyPool, bassPool };
}

function buildTimeline(ctx, resolved) {
  if (ctx.barBased && ctx.barTimeline) {
    return getBarSectionTimeline(
      ctx.arrangementId,
      resolved.patternCount,
      ctx.linesPerPattern,
      ctx.lpb,
      ctx.seedVal,
      energyToTrackDensities
    );
  }
  return getSectionTimeline(resolved.arrangementId, resolved.patternCount);
}

/**
 * Generate all patterns for a full song project.
 */
function generateSongProject(params) {
  const resolved = resolveSongParams(params);
  const { ctx } = resolved;
  const built = buildTrackMeta(params, resolved);
  if (built.error) return { error: built.error };

  const { trackMeta, melodyPool, bassPool } = built;
  const { linesPerPattern, patternCount, keyName, scaleIdx } = resolved;
  const patterns = [];
  const sectionNames = [];
  const sectionEnergies = [];
  const hatFingerprintCache = new Map();
  clearSectionBundleCache();
  if (ctx.clearRhythmCaches) ctx.clearRhythmCaches();

  for (let p = 0; p < patternCount; p++) {
    const section = getSectionForPattern(ctx, resolved, p);
    sectionNames.push(section.name);
    sectionEnergies.push(section.energy);
    const rhythmPlan = ctx.getRhythmPlan ? ctx.getRhythmPlan(p) : null;
    const patternTracks = trackMeta.map(t => {
      const result = generateTrackCellsForPattern(
        params, resolved, ctx, t.key, p, melodyPool, bassPool, hatFingerprintCache, rhythmPlan
      );
      return { cells: result?.cells || Array(linesPerPattern).fill('') };
    });
    patterns.push(patternTracks);
  }

  const noteCounts = trackMeta.map((t, i) => {
    let total = 0;
    patterns.forEach(pat => {
      total += countNotesInTrack(pat[i].cells);
    });
    return total;
  });

  const timeline = buildTimeline(ctx, resolved);

  return {
    tracks: trackMeta.map((t, i) => ({
      key: t.key,
      name: t.name,
      instrument: t.instrument,
      noteCount: noteCounts[i]
    })),
    patterns,
    linesPerPattern,
    patternCount,
    bpm: resolved.bpm,
    lpb: resolved.lpb,
    sectionNames,
    sectionEnergies,
    songName: resolved.songName,
    durationSeconds: resolved.durationSeconds,
    durationFormatted: resolved.durationFormatted,
    timeline,
    composition: {
      style: ctx.style?.id || null,
      barBased: ctx.barBased,
      totalBars: ctx.barTimeline?.totalBars || null,
      barsPerPattern: ctx.bpp,
      parentMotif: ctx.parentMotif
        ? {
          pitchSequence: ctx.parentMotif.noteTokens.join(' '),
          contour: ctx.parentMotif.contour,
          tension: ctx.parentMotif.tension
        }
        : null,
      motifVariants: ctx.motifFamily ? Object.keys(ctx.motifFamily) : [],
      chordProgression: ctx.chordTimeline?.progression || null
    },
    instrumentSlotNames: buildInstrumentNameMap(),
    key: keyName,
    scaleIdx
  };
}

/** Legacy clipboard XML — first pattern only. */
function generateSong(params) {
  const project = generateSongProject(params);
  if (project.error) return project;

  const xmlTracks = project.tracks.map((t, i) => ({
    name: t.name,
    cells: project.patterns[0][i].cells,
    instrument: t.instrument
  }));

  return {
    xml: buildMultiTrackXml(xmlTracks, project.linesPerPattern),
    tracks: project.tracks,
    timeline: project.timeline,
    key: project.key,
    scaleIdx: project.scaleIdx,
    patternCount: project.patternCount,
    durationFormatted: project.durationFormatted
  };
}

async function generateSongXrns(params) {
  const project = generateSongProject(params);
  if (project.error) return project;

  const exportLpb = project.composition?.barBased ? 4 : project.lpb;

  const buffer = await buildXrns({
    tracks: project.tracks,
    patterns: project.patterns,
    linesPerPattern: project.linesPerPattern,
    bpm: project.bpm,
    lpb: exportLpb,
    sectionNames: project.sectionNames,
    songName: project.songName,
    instrumentSlotNames: project.instrumentSlotNames || buildInstrumentNameMap()
  });

  return {
    ...project,
    xrnsBase64: buffer.toString('base64'),
    xrnsByteLength: buffer.length
  };
}

module.exports = {
  generateSong,
  generateSongProject,
  generateSongXrns,
  listArrangements,
  DEFAULT_TRACKS,
  resolveSongParams,
  MAX_INSTRUMENT_SLOT
};
