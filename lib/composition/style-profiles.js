/**
 * Psytrance style profiles — BPM, length, density, and scale defaults per subgenre.
 */

const STYLES = {
  progressive: {
    id: 'progressive',
    name: 'Progressive Psytrance',
    arrangementId: 'progressive',
    description: 'Groove-first, melodic, atmospheric — offbeat bass, 6–8 min',
    bpmRange: [136, 140],
    bpmDefaults: [138, 140],
    songMinutesRange: [6, 8],
    bassStyle: 'offbeat',
    leadNotesPerBar: [5, 13],
    variationRate: [0.2, 0.3],
    scaleWeights: [
      { scaleIndex: 1, weight: 50 },
      { scaleIndex: 2, weight: 25 },
      { scaleIndex: 12, weight: 15 },
      { scaleIndex: 10, weight: 10 }
    ],
    keyWeights: [
      { key: 'F', weight: 25 },
      { key: 'F#', weight: 25 },
      { key: 'G', weight: 25 },
      { key: 'A', weight: 25 }
    ],
    bassNoteWeights: { root: 74, fifth: 7, passing: 18 },
    snareRollP: 20,
    openHatP: 20,
    hatSkipP: 15,
    hatMaxLayers: 4,
    hatVariationRate: [0.2, 0.3],
    hatFillP: 20,
    hatAccentP: 25
  },
  fullOn: {
    id: 'fullOn',
    name: 'Full-On Psytrance',
    arrangementId: 'fullOn',
    description: 'High density, rolling bass, aggressive — 7–9 min',
    bpmRange: [142, 148],
    bpmDefaults: [145, 146],
    songMinutesRange: [7, 9],
    bassStyle: 'rolling',
    leadNotesPerBar: [7, 15],
    variationRate: [0.3, 0.4],
    scaleWeights: [
      { scaleIndex: 1, weight: 50 },
      { scaleIndex: 2, weight: 25 },
      { scaleIndex: 12, weight: 15 },
      { scaleIndex: 10, weight: 10 }
    ],
    keyWeights: [
      { key: 'F', weight: 25 },
      { key: 'F#', weight: 25 },
      { key: 'G', weight: 25 },
      { key: 'A', weight: 25 }
    ],
    bassNoteWeights: { root: 78, fifth: 5, passing: 17 },
    snareRollP: 40,
    openHatP: 30,
    hatSkipP: 8,
    hatMaxLayers: 6,
    hatVariationRate: [0.3, 0.4],
    hatFillP: 35,
    hatAccentP: 40
  }
};

const STYLE_ALIASES = {
  minimal: 'progressive',
  prog: 'progressive'
};

function getStyleProfile(id) {
  if (!id) return null;
  const resolved = STYLE_ALIASES[id] || id;
  return STYLES[resolved] || null;
}

function listStyles() {
  return Object.values(STYLES).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    arrangementId: s.arrangementId
  }));
}

function isBarBasedStyle(id) {
  const style = getStyleProfile(id);
  return style != null;
}

/** Pick from weighted list using rng() in [0,1). */
function pickWeighted(items, rng) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = rng() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

function pickBpm(style, rng) {
  if (rng() < 0.5) return style.bpmDefaults[0];
  return style.bpmDefaults[1];
}

function pickKey(style, rng) {
  return pickWeighted(style.keyWeights, rng).key;
}

function pickScaleIndex(style, rng) {
  return pickWeighted(style.scaleWeights, rng).scaleIndex;
}

module.exports = {
  STYLES,
  getStyleProfile,
  listStyles,
  isBarBasedStyle,
  pickWeighted,
  pickBpm,
  pickKey,
  pickScaleIndex
};
