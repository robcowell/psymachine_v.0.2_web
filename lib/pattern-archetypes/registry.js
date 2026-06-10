/**
 * Psytrance pattern archetype library — H, C, P, B, L categories.
 */

const { parseArchetypeString, eventDensity } = require('./encode');

function define(id, category, notation, opts = {}) {
  const events = parseArchetypeString(notation, category);
  return {
    id,
    category,
    styles: opts.styles || 'all',
    weight: opts.weight ?? 5,
    density: opts.density ?? eventDensity(events),
    events,
    notation
  };
}

const HAT_ARCHETYPES = [
  define('H1', 'hat', '----x-------x---', { weight: 10, styles: ['progressive', 'fullOn'] }),
  define('H2', 'hat', '----x---o---x---', { weight: 7 }),
  define('H3', 'hat', '----xx------x---', { weight: 5 }),
  define('H4', 'hat', '--x-x---x-x---x-', { weight: 6, styles: ['fullOn'] }),
  define('H5', 'hat', '----x-x---x-x---', { weight: 6 })
];

const CLAP_ARCHETYPES = [
  define('C1', 'clap', '----C-------C---', { weight: 10 }),
  define('C2', 'clap', '----C---C---C---', { weight: 6 }),
  define('C3', 'clap', '--------C-------', { weight: 4 })
];

const PERC_ARCHETYPES = [
  define('P1', 'perc', '--p-----p-----p-', { weight: 8, styles: ['progressive'] }),
  define('P2', 'perc', '--p-p---p-p---p-', { weight: 7, styles: ['fullOn'] }),
  define('P3', 'perc', '-p--p-p--p--p---', { weight: 4 }),
  define('P4', 'perc', '---p---p-p------', { weight: 5 })
];

const BASS_ARCHETYPES = [
  define('B1', 'bass', 'K---B---K---B---', { weight: 10, styles: ['progressive'] }),
  define('B2', 'bass', 'KBBBKBBBKBBBKBBB', { weight: 10, styles: ['fullOn'] }),
  define('B3', 'bass', 'KB-BKB-BKB-BKB-B', { weight: 6, styles: ['progressive'] }),
  define('B4', 'bass', 'K-------K-------', { weight: 5 })
];

const LEAD_RHYTHM_ARCHETYPES = [
  define('L1', 'leadRhythm', 'x---x---x---x---', { weight: 10 }),
  define('L2', 'leadRhythm', 'x--x---x--x-----', { weight: 7 }),
  define('L3', 'leadRhythm', 'x-x-x-----x-x---', { weight: 5 }),
  define('L4', 'leadRhythm', 'x---x-----------', { weight: 4 }),
  define('L5', 'leadRhythm', '------x---x-----', { weight: 4 })
];

const ALL_ARCHETYPES = [
  ...HAT_ARCHETYPES,
  ...CLAP_ARCHETYPES,
  ...PERC_ARCHETYPES,
  ...BASS_ARCHETYPES,
  ...LEAD_RHYTHM_ARCHETYPES
];

const BY_ID = Object.fromEntries(ALL_ARCHETYPES.map(a => [a.id, a]));

const BY_CATEGORY = {
  hat: HAT_ARCHETYPES,
  clap: CLAP_ARCHETYPES,
  perc: PERC_ARCHETYPES,
  bass: BASS_ARCHETYPES,
  leadRhythm: LEAD_RHYTHM_ARCHETYPES
};

const LEGACY_BASS_STYLE_MAP = {
  offbeat: 'B1',
  rolling: 'B2',
  staccato: 'B4'
};

function getArchetype(id) {
  return BY_ID[id] || null;
}

function getArchetypesByCategory(category) {
  return BY_CATEGORY[category] || [];
}

module.exports = {
  HAT_ARCHETYPES,
  CLAP_ARCHETYPES,
  PERC_ARCHETYPES,
  BASS_ARCHETYPES,
  LEAD_RHYTHM_ARCHETYPES,
  ALL_ARCHETYPES,
  BY_ID,
  BY_CATEGORY,
  LEGACY_BASS_STYLE_MAP,
  getArchetype,
  getArchetypesByCategory,
  define
};
