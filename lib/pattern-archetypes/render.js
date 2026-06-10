/**
 * Render archetype events into Renoise cells[] grids.
 */

const { DRUM_TRIGGERS } = require('../music-theory');
const { randomPercent } = require('../rng');
const { sixteenthToLine, barLineCount, sixteenthStep } = require('./encode');
const { getArchetype } = require('./registry');

const HAT_TOKENS = {
  closed: DRUM_TRIGGERS.hihatClosed,
  open: DRUM_TRIGGERS.hihatOpen
};

function emptyTrack(len) {
  return Array(len).fill('');
}

function resolveEventToken(category, event, options = {}) {
  if (category === 'hat') return HAT_TOKENS[event.type] || HAT_TOKENS.closed;
  if (category === 'clap') {
    const useClap = options.useClap !== false;
    if (useClap && randomPercent(60, options.rng || (() => 0.5))) {
      return DRUM_TRIGGERS.snare;
    }
    return useClap ? DRUM_TRIGGERS.clap : DRUM_TRIGGERS.snare;
  }
  if (category === 'perc') return DRUM_TRIGGERS.ride;
  if (category === 'bass') {
    if (event.type === 'kickRef') return null;
    return options.note || '';
  }
  if (category === 'leadRhythm') return null;
  return '';
}

/**
 * Render a single archetype across trackLength.
 */
function renderArchetype(archetypeOrId, trackLength, lpb, rng, options = {}) {
  const archetype = typeof archetypeOrId === 'string' ? getArchetype(archetypeOrId) : archetypeOrId;
  if (!archetype) return emptyTrack(trackLength);

  const cells = emptyTrack(trackLength);
  const barLines = barLineCount(lpb);
  const barCount = Math.ceil(trackLength / barLines);
  const renderOpts = { ...options, rng };

  for (let bar = 0; bar < barCount; bar++) {
    for (const event of archetype.events) {
      const line = sixteenthToLine(event.pos, bar, lpb);
      if (line >= trackLength) continue;

      if (archetype.category === 'bass' && event.type === 'bass') {
        const notePicker = options.pickNote;
        cells[line] = notePicker ? notePicker(line, bar, event, renderOpts) : (options.note || '');
      } else if (archetype.category === 'clap') {
        cells[line] = resolveEventToken('clap', event, renderOpts);
      } else if (archetype.category === 'hat') {
        cells[line] = resolveEventToken('hat', event, renderOpts);
      } else if (archetype.category === 'perc') {
        cells[line] = resolveEventToken('perc', event, renderOpts);
      }
    }
  }
  return cells;
}

/**
 * Render multiple archetype IDs of same category and merge cells (last wins).
 */
function renderArchetypeStack(ids, category, trackLength, lpb, rng, options = {}) {
  let merged = emptyTrack(trackLength);
  for (const id of ids) {
    const layer = renderArchetype(id, trackLength, lpb, rng, options);
    for (let i = 0; i < trackLength; i++) {
      if (layer[i]) merged[i] = layer[i];
    }
  }
  return merged;
}

/**
 * Render hat archetypes into Map<line, token> with open-over-closed merge.
 */
function renderHatMaps(ids, trackLength, lpb) {
  const maps = ids.map(id => {
    const archetype = getArchetype(id);
    const map = new Map();
    if (!archetype) return map;
    const barLines = barLineCount(lpb);
    const barCount = Math.ceil(trackLength / barLines);
    for (let bar = 0; bar < barCount; bar++) {
      for (const event of archetype.events) {
        const line = sixteenthToLine(event.pos, bar, lpb);
        if (line >= trackLength) continue;
        const token = HAT_TOKENS[event.type] || HAT_TOKENS.closed;
        map.set(line, token);
      }
    }
    return map;
  });
  return mergeHatMaps(maps);
}

function mergeHatMaps(maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [line, token] of map) {
      const existing = merged.get(line);
      if (!existing) {
        merged.set(line, token);
      } else if (token === HAT_TOKENS.open) {
        merged.set(line, token);
      }
    }
  }
  return merged;
}

function mapToCells(map, trackLength) {
  const cells = emptyTrack(trackLength);
  for (const [line, token] of map) {
    if (line >= 0 && line < trackLength) cells[line] = token;
  }
  return cells;
}

/**
 * Extract 16th onset positions for lead rhythm archetypes (one bar, scaled).
 */
function leadRhythmOffsets(archetypeOrId, barLines, lpb) {
  const archetype = typeof archetypeOrId === 'string' ? getArchetype(archetypeOrId) : archetypeOrId;
  if (!archetype || archetype.category !== 'leadRhythm') return [];

  const step = sixteenthStep(lpb);
  const scale = barLines / 16;
  return archetype.events
    .filter(e => e.type === 'onset')
    .map(e => Math.min(barLines - 1, Math.max(0, Math.round(e.pos * scale * (step / Math.max(1, step))))));
}

function leadRhythmOffsetsForBar(archetypeOrId, lpb) {
  const barLines = barLineCount(lpb);
  const archetype = typeof archetypeOrId === 'string' ? getArchetype(archetypeOrId) : archetypeOrId;
  if (!archetype) return [];
  const step = sixteenthStep(lpb);
  return archetype.events
    .filter(e => e.type === 'onset')
    .map(e => Math.min(barLines - 1, e.pos * step));
}

module.exports = {
  emptyTrack,
  renderArchetype,
  renderArchetypeStack,
  renderHatMaps,
  mergeHatMaps,
  mapToCells,
  leadRhythmOffsets,
  leadRhythmOffsetsForBar,
  HAT_TOKENS
};
