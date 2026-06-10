/**
 * Section lifecycle → recommended archetype bundles (narrows energy pool).
 */

const SECTION_ROLE_RULES = [
  {
    match: /intro|dj intro/i,
    archetypes: { hat: ['H1'], clap: [], perc: [], bass: [], leadRhythm: [] }
  },
  {
    match: /groove introduction|groove$/i,
    archetypes: { hat: ['H1', 'H2'], clap: [], perc: [], bass: ['B1'], leadRhythm: [] }
  },
  {
    match: /development|bass.*perc/i,
    archetypes: { hat: ['H1', 'H2'], clap: ['C1'], perc: ['P1'], bass: ['B1'], leadRhythm: [] }
  },
  {
    match: /theme a/i,
    archetypes: { hat: ['H1', 'H2'], clap: ['C1'], perc: [], bass: ['B1'], leadRhythm: ['L1'] }
  },
  {
    match: /theme b/i,
    archetypes: { hat: ['H1', 'H2'], clap: ['C1'], perc: ['P1'], bass: ['B1'], leadRhythm: ['L1', 'L2'] }
  },
  {
    match: /breakdown|main break|major break/i,
    archetypes: { hat: [], clap: ['C3'], perc: [], bass: [], leadRhythm: ['L1'] }
  },
  {
    match: /build|peak section/i,
    archetypes: { hat: ['H3'], clap: ['C2'], perc: [], bass: [], leadRhythm: ['L3'] }
  },
  {
    match: /climax|peak$/i,
    archetypes: { hat: ['H1', 'H2', 'H5'], clap: ['C1', 'C2'], perc: ['P2'], bass: ['B1'], leadRhythm: ['L1', 'L2'] }
  },
  {
    match: /outro/i,
    archetypes: { hat: ['H1'], clap: [], perc: [], bass: ['B4'], leadRhythm: [] }
  }
];

const DEFAULT_ROLE = {
  archetypes: { hat: ['H1'], clap: ['C1'], perc: ['P1'], bass: ['B1'], leadRhythm: ['L1'] }
};

function resolveSectionRole(sectionName) {
  if (!sectionName) return DEFAULT_ROLE;
  for (const rule of SECTION_ROLE_RULES) {
    if (rule.match.test(sectionName)) return rule;
  }
  return DEFAULT_ROLE;
}

/**
 * Fade archetype layers during outro by bar position.
 */
function applyOutroFade(archetypes, barInSection, sectionBars) {
  if (sectionBars <= 0) return archetypes;
  const t = barInSection / sectionBars;
  if (t < 0.5) return archetypes;

  const fade = Math.max(0, 1 - (t - 0.5) * 2);
  if (fade >= 0.75) return archetypes;

  const out = { ...archetypes };
  if (fade < 0.5) {
    out.perc = [];
    out.leadRhythm = [];
  }
  if (fade < 0.25) {
    out.bass = out.bass.slice(0, 1);
    out.clap = [];
  }
  if (fade < 0.1) {
    out.hat = out.hat.slice(0, 1);
  }
  return out;
}

module.exports = {
  SECTION_ROLE_RULES,
  resolveSectionRole,
  applyOutroFade
};
