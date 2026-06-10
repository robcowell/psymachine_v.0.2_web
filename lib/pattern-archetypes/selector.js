/**
 * Energy-driven archetype selection with style weighting — @corpus-dms-generated
 */

const { getArchetype, getArchetypesByCategory } = require('./registry');
const { resolveSectionRole, applyOutroFade, adaptArchetypesForBassStyle } = require('./section-roles');

const ENERGY_BANDS = [
  { max: 25, allowed: new Set(['H1', 'C3', 'P1', 'B1', 'B4', 'B8']) },
  {
    max: 50,
    allowed: new Set(['H1', 'H2', 'C1', 'C3', 'P1', 'B1', 'B2', 'B4', 'B6', 'L1', 'L2'])
  },
  {
    max: 75,
    allowed: new Set([
      'H1', 'H2', 'H3', 'C1', 'C3', 'P1', 'P2', 'B1', 'B2', 'B3', 'B4', 'B6', 'B7', 'L1', 'L2', 'L7'
    ])
  },
  { max: 100, allowed: null }
];

const STYLE_WEIGHT_MULT = {
  progressive: {
    H1: 1.3, H2: 1.4, H4: 0.5, C1: 1.4, C2: 0.4, C3: 0.7, P1: 1.1, P2: 0.7,
    B1: 1.4, B2: 0.6, B3: 1.2, L1: 1.2, L2: 1.1, L3: 0.5, L4: 0.8, L5: 0.9, L7: 1.0
  },
  fullOn: {
    H4: 1.4, H5: 1.3, C1: 1.4, B2: 1.5, B1: 0.7, P2: 1.4, P1: 0.7,
    L1: 0.5, L2: 0.4, L4: 1.2, L5: 1.5
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

function effectiveWeight(archetype, styleId, bassStyle) {
  let w = archetype.weight;
  const mults = STYLE_WEIGHT_MULT[styleId];
  if (mults && mults[archetype.id]) w *= mults[archetype.id];
  if (bassStyle === 'rolling' && archetype.category === 'bass') {
    if (archetype.id === 'B2' || archetype.id === 'B6' || archetype.id === 'B7') w *= 1.6;
    if (archetype.id === 'B1' || archetype.id === 'B4') w *= 0.35;
  }
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
function selectForCategory(category, energy, styleId, roleIds, rng, bassStyle) {
  const roleSet = roleIds && roleIds.length ? new Set(roleIds) : null;
  const pool = getArchetypesByCategory(category);
  const styleOk = a => styleAllows(a, styleId);
  const energyOk = a => energyBandAllowed(energy, a.id);

  // Section roles (Peak → B2, etc.) beat energy bands so build ramps still get the right groove.
  let candidates = roleSet
    ? pool
      .filter(a => roleSet.has(a.id))
      .filter(styleOk)
      .map(a => ({ id: a.id, weight: effectiveWeight(a, styleId, bassStyle) }))
    : pool
      .filter(energyOk)
      .filter(styleOk)
      .map(a => ({ id: a.id, weight: effectiveWeight(a, styleId, bassStyle) }));

  if (!candidates.length) {
    const fallback = pool.find(a => energyOk(a) && styleOk(a));
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
  bassStyle,
  barInSection = 0,
  sectionBars = 16,
  rng
}) {
  const role = resolveSectionRole(sectionName);
  let roleArchetypes = adaptArchetypesForBassStyle(
    { ...role.archetypes },
    bassStyle
  );

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
    archetypes[cat] = selectForCategory(cat, energy, styleId, roleIds, rng, bassStyle);
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
