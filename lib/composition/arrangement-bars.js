/**
 * Bar-accurate psytrance arrangement templates.
 * Sections use fixed or ranged bar counts (design doc).
 */

const { seededRandom, deriveSeed } = require('../rng');

const BAR_ARRANGEMENTS = {
  progressive: {
    name: 'Progressive Psytrance',
    description: 'Intro → groove → development → themes → breakdown → climax → outro',
    sections: [
      { name: 'Intro', bars: [16, 32], energy: 0 },
      { name: 'Groove Introduction', bars: 16, energy: 25 },
      { name: 'Bass + Percussion Development', bars: 16, energy: 40 },
      { name: 'Theme A', bars: 32, energy: 55 },
      { name: 'Breakdown', bars: 16, energy: 45, flags: { breakdown: true } },
      { name: 'Theme B', bars: 32, energy: 70 },
      { name: 'Main Break', bars: 32, energy: 35, flags: { breakdown: true } },
      { name: 'Climax', bars: 64, energy: 100 },
      { name: 'Outro', bars: [16, 32], energy: 25 }
    ]
  },
  fullOn: {
    name: 'Full-On Psytrance',
    description: 'DJ intro → groove → themes → breaks → peak → outro',
    sections: [
      { name: 'DJ Intro', bars: 32, energy: 15 },
      { name: 'Groove', bars: 32, energy: 45 },
      { name: 'Theme A', bars: 32, energy: 65 },
      { name: 'Break', bars: 16, energy: 40, flags: { breakdown: true } },
      { name: 'Theme B', bars: 32, energy: 75 },
      { name: 'Major Break', bars: 32, energy: 30, flags: { breakdown: true } },
      { name: 'Peak Section', bars: 64, energy: 100 },
      { name: 'Outro', bars: 32, energy: 20 }
    ]
  }
};

function resolveSectionBars(section, rng) {
  const b = section.bars;
  if (Array.isArray(b)) {
    const [min, max] = b;
    return min + Math.floor(rng() * (max - min + 1));
  }
  return b;
}

/**
 * Build a concrete bar timeline from a template. Same seed → same bar counts.
 */
function buildBarTimeline(arrangementId, seedVal) {
  const template = BAR_ARRANGEMENTS[arrangementId];
  if (!template) return null;

  const rng = seededRandom(deriveSeed(seedVal, `bars-${arrangementId}`));
  let bar = 0;
  const sections = [];

  for (const s of template.sections) {
    const bars = resolveSectionBars(s, rng);
    sections.push({
      name: s.name,
      startBar: bar,
      endBar: bar + bars,
      bars,
      energy: s.energy,
      flags: s.flags || {}
    });
    bar += bars;
  }

  return {
    id: arrangementId,
    name: template.name,
    description: template.description,
    sections,
    totalBars: bar
  };
}

function findSectionAtBar(timeline, bar) {
  if (!timeline) return null;
  const b = Math.max(0, bar);
  for (const s of timeline.sections) {
    if (b >= s.startBar && b < s.endBar) return s;
  }
  const last = timeline.sections[timeline.sections.length - 1];
  return last || null;
}

function barsPerPattern(linesPerPattern, lpb) {
  const beats = linesPerPattern / Math.max(1, lpb);
  return beats / 4;
}

function patternCountFromTimeline(timeline, linesPerPattern, lpb) {
  const bpp = barsPerPattern(linesPerPattern, lpb);
  if (bpp <= 0) return 1;
  return Math.max(1, Math.ceil(timeline.totalBars / bpp));
}

function getSectionForPattern(timeline, patternIndex, linesPerPattern, lpb) {
  const bpp = barsPerPattern(linesPerPattern, lpb);
  const startBar = patternIndex * bpp;
  const midBar = startBar + bpp * 0.5;
  return findSectionAtBar(timeline, midBar);
}

/**
 * Timeline for UI — pattern indices with energy and track densities.
 */
function getBarSectionTimeline(arrangementId, patternCount, linesPerPattern, lpb, seedVal, energyToTrackDensities) {
  const timeline = buildBarTimeline(arrangementId, seedVal);
  if (!timeline) return null;

  const bpp = barsPerPattern(linesPerPattern, lpb);
  return timeline.sections.map(s => ({
    name: s.name,
    startBar: s.startBar,
    endBar: s.endBar,
    bars: s.bars,
    energy: s.energy,
    startLine: Math.floor(s.startBar / bpp),
    endLine: Math.min(patternCount, Math.ceil(s.endBar / bpp)),
    tracks: energyToTrackDensities(s.energy, s.flags)
  }));
}

function listBarArrangements() {
  return Object.entries(BAR_ARRANGEMENTS).map(([id, a]) => ({
    id,
    name: a.name,
    description: a.description,
    barBased: true
  }));
}

module.exports = {
  BAR_ARRANGEMENTS,
  buildBarTimeline,
  findSectionAtBar,
  getSectionForPattern,
  getBarSectionTimeline,
  listBarArrangements,
  barsPerPattern,
  patternCountFromTimeline
};
