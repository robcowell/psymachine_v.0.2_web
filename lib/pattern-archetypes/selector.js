/**
 * Energy-driven archetype selection with style weighting.
 */

const { getArchetype, getArchetypesByCategory } = require('./registry');
const { resolveSectionRole, applyOutroFade } = require('./section-roles');

const ENERGY_BANDS = [
  { max: 25, allowed: new Set(['H1', 'C3', 'P1', 'B4']) },
  {
    max: 50,
    allowed: new Set(['H1', 'H2', 'C1', 'C3', 'P1', 'B1', 'B4', 'L1'])
  },
  {
    max: 75,
    allowed: new Set([
      'H1', 'H2', 'H3', 'C1', 'C3', 'P1', 'P2', 'B1', 'B3', 'B4', 'L1', 'L2'
    ])
  },
  { max: 100, allowed: null }
];

const STYLE_WEIGHT_MULT = {
  progressive: {
    H1: 1.3, H4: 0.5, B1: 1.4, B2: 0.6, B3: 1.2, P1: 1.3, P2: 0.7, L1: 1.2
  },
  fullOn: {
    H4: 1.4, H5: 1.3, B2: 1.5, B1: 0.7, P2: 1.4, P1: 0.7, L2: 1.2, L3: 1.1
  }
};

function energyBandAllowed(energy, id) {
  for (const band of ENERGY_BANDS) {
    if (energy <= band.max) {
      if (band.allowed === null) return true;
      return band.allowed.has(id);
    }
  }
  return true;
}

function styleAllows(archetype, styleId) {
  if (!archetype) return false;
  if (archetype.styles === 'all') return true;
  if (!styleId) return true;
  return archetype.styles.includes(styleId);
}

function effectiveWeight(archetype, styleId) {
  let w = archetype.weight;
  const mults = STYLE_WEIGHT_MULT[styleId];
  if (mults && mults[archetype.id]) w *= mults[archetype.id];
  return w;
}

function pickFromCandidates(candidates, rng) {
  if (!candidates.length) return [];
  if (candidates.length === 1) return [candidates[0].id];

  const total = candidates.reduce((s, c) => s + c.weight, 0);
  let roll = rng() * total;
  for (const c of candidates) {
    roll -= c.weight;
    if (roll <= 0) return [c.id];
  }
  return [candidates[candidates.length - 1].id];
}

/**
 * Select archetype IDs for one category given constraints.
 */
function selectForCategory(category, energy, styleId, roleIds, rng) {
  const roleSet = roleIds && roleIds.length ? new Set(roleIds) : null;
  const pool = getArchetypesByCategory(category);

  const candidates = pool
    .filter(a => energyBandAllowed(energy, a.id))
    .filter(a => styleAllows(a, styleId))
    .filter(a => !roleSet || roleSet.has(a.id))
    .map(a => ({ id: a.id, weight: effectiveWeight(a, styleId) }));

  if (!candidates.length) {
    const fallback = pool.find(a => energyBandAllowed(energy, a.id) && styleAllows(a, styleId));
    return fallback ? [fallback.id] : [];
  }

  if (roleSet && roleIds.length > 1) {
    return roleIds.filter(id => {
      const a = getArchetype(id);
      return a && candidates.some(c => c.id === id);
    });
  }

  return pickFromCandidates(candidates, rng);
}

/**
 * Build full archetype bundle for a section.
 */
function selectArchetypeBundle({
  energy,
  sectionName,
  styleId,
  barInSection = 0,
  sectionBars = 16,
  rng
}) {
  const role = resolveSectionRole(sectionName);
  let roleArchetypes = { ...role.archetypes };

  if (/outro/i.test(sectionName || '')) {
    roleArchetypes = applyOutroFade(roleArchetypes, barInSection, sectionBars);
  }

  const categories = ['hat', 'clap', 'perc', 'bass', 'leadRhythm'];
  const archetypes = {};

  for (const cat of categories) {
    const roleIds = roleArchetypes[cat] || [];
    if (roleIds.length === 0 && /breakdown|break/i.test(sectionName || '')) {
      archetypes[cat] = [];
      continue;
    }
    archetypes[cat] = selectForCategory(cat, energy, styleId, roleIds, rng);
  }

  return archetypes;
}

module.exports = {
  ENERGY_BANDS,
  energyBandAllowed,
  selectForCategory,
  selectArchetypeBundle,
  effectiveWeight
};
