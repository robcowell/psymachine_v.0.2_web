/**
 * Psytrance arrangement templates — section-based track muting and density.
 *
 * Sections are defined as fractions of total pattern length.
 * Each section specifies which tracks are active and at what density (0–1).
 */

const { listBarArrangements } = require('./composition/arrangement-bars');

const ARRANGEMENTS = {
  classic: {
    name: 'Classic Psytrance',
    description: 'Intro → build → drop → breakdown → drop → outro',
    sections: [
      { name: 'Intro', start: 0, end: 0.125, tracks: { kick: 0.5, hihat: 0.3, snare: 0, bass: 0, lead: 0.2, fx: 0.4, perc: 0 } },
      { name: 'Build', start: 0.125, end: 0.25, tracks: { kick: 0.8, hihat: 0.7, snare: 0.3, bass: 0.4, lead: 0.5, fx: 0.8, perc: 0.2 } },
      { name: 'Drop', start: 0.25, end: 0.5, tracks: { kick: 1, hihat: 1, snare: 1, bass: 1, lead: 1, fx: 0.5, perc: 0.6 } },
      { name: 'Breakdown', start: 0.5, end: 0.625, tracks: { kick: 0.3, hihat: 0.4, snare: 0.2, bass: 0.2, lead: 0.7, fx: 0.9, perc: 0.3 } },
      { name: 'Drop 2', start: 0.625, end: 0.875, tracks: { kick: 1, hihat: 1, snare: 1, bass: 1, lead: 1, fx: 0.4, perc: 0.7 } },
      { name: 'Outro', start: 0.875, end: 1, tracks: { kick: 0.6, hihat: 0.5, snare: 0.4, bass: 0.5, lead: 0.4, fx: 0.3, perc: 0.2 } }
    ]
  },
  fullOn: {
    name: 'Full-On',
    description: 'Short intro, long driving drop with rolling bass',
    sections: [
      { name: 'Intro', start: 0, end: 0.1, tracks: { kick: 0.6, hihat: 0.5, snare: 0, bass: 0, lead: 0.3, fx: 0.3, perc: 0 } },
      { name: 'Build', start: 0.1, end: 0.2, tracks: { kick: 1, hihat: 0.8, snare: 0.5, bass: 0.6, lead: 0.6, fx: 0.7, perc: 0.3 } },
      { name: 'Drop', start: 0.2, end: 0.7, tracks: { kick: 1, hihat: 1, snare: 1, bass: 1, lead: 1, fx: 0.3, perc: 0.5 } },
      { name: 'Break', start: 0.7, end: 0.8, tracks: { kick: 0.2, hihat: 0.3, snare: 0.1, bass: 0.1, lead: 0.8, fx: 1, perc: 0.2 } },
      { name: 'Final Drop', start: 0.8, end: 0.95, tracks: { kick: 1, hihat: 1, snare: 1, bass: 1, lead: 1, fx: 0.5, perc: 0.8 } },
      { name: 'Outro', start: 0.95, end: 1, tracks: { kick: 0.5, hihat: 0.4, snare: 0.3, bass: 0.3, lead: 0.3, fx: 0.2, perc: 0.1 } }
    ]
  },
  minimal: {
    name: 'Minimal / Progressive',
    description: 'Gradual layer addition, staccato bass sections',
    sections: [
      { name: 'Intro', start: 0, end: 0.2, tracks: { kick: 0.7, hihat: 0.4, snare: 0, bass: 0, lead: 0.4, fx: 0.5, perc: 0 } },
      { name: 'Layer 1', start: 0.2, end: 0.4, tracks: { kick: 0.8, hihat: 0.6, snare: 0.3, bass: 0.5, lead: 0.6, fx: 0.4, perc: 0.2 } },
      { name: 'Layer 2', start: 0.4, end: 0.6, tracks: { kick: 1, hihat: 0.8, snare: 0.7, bass: 0.8, lead: 0.8, fx: 0.3, perc: 0.4 } },
      { name: 'Peak', start: 0.6, end: 0.8, tracks: { kick: 1, hihat: 1, snare: 1, bass: 1, lead: 1, fx: 0.5, perc: 0.5 } },
      { name: 'Outro', start: 0.8, end: 1, tracks: { kick: 0.6, hihat: 0.5, snare: 0.4, bass: 0.4, lead: 0.5, fx: 0.3, perc: 0.2 } }
    ]
  },
  loop: {
    name: 'Single Loop',
    description: 'All tracks at full density — good for 1-pattern loops',
    sections: [
      { name: 'Loop', start: 0, end: 1, tracks: { kick: 1, hihat: 1, snare: 1, bass: 1, lead: 1, fx: 0.6, perc: 0.5 } }
    ]
  }
};

function getArrangement(id) {
  return ARRANGEMENTS[id] || ARRANGEMENTS.classic;
}

function listArrangements() {
  const barArrs = listBarArrangements();
  const legacy = Object.entries(ARRANGEMENTS).map(([id, a]) => ({
    id,
    name: a.name,
    description: a.description,
    barBased: false
  }));
  const barIds = new Set(barArrs.map(a => a.id));
  const filteredLegacy = legacy.filter(a => !barIds.has(a.id) || a.id === 'minimal');
  return [...barArrs, ...filteredLegacy];
}

/**
 * Apply arrangement density mask to a track.
 * Cells outside active sections or below density threshold are cleared.
 */
function applyArrangementMask(cells, trackLength, arrangementId, trackKey, rng) {
  const arr = getArrangement(arrangementId);
  const result = cells.slice();

  for (const section of arr.sections) {
    const startLine = Math.floor(section.start * trackLength);
    const endLine = Math.floor(section.end * trackLength);
    const density = section.tracks[trackKey];
    if (density == null) continue;

    if (density <= 0) {
      for (let i = startLine; i < endLine && i < trackLength; i++) result[i] = '';
    } else if (density < 1) {
      for (let i = startLine; i < endLine && i < trackLength; i++) {
        if (result[i] !== '' && result[i] !== 'OFF') {
          if ((rng() * 100 | 0) + 1 > density * 100) result[i] = '';
        }
      }
    }
  }
  return result;
}

/**
 * Get section timeline for UI visualization.
 */
function getSectionTimeline(arrangementId, trackLength) {
  const arr = getArrangement(arrangementId);
  return arr.sections.map(s => ({
    name: s.name,
    startLine: Math.floor(s.start * trackLength),
    endLine: Math.floor(s.end * trackLength),
    tracks: { ...s.tracks }
  }));
}

module.exports = {
  ARRANGEMENTS,
  getArrangement,
  listArrangements,
  applyArrangementMask,
  getSectionTimeline
};
