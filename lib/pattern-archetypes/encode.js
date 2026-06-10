/**
 * 16th-grid notation → archetype events; line index math.
 */

const SYMBOL_MAP = {
  hat: { x: 'closed', o: 'open' },
  clap: { C: 'clap' },
  perc: { p: 'perc' },
  bass: { B: 'bass', K: 'kickRef' },
  leadRhythm: { x: 'onset' }
};

function sixteenthStep(lpb) {
  return Math.max(1, Math.floor(lpb / 4));
}

function barLineCount(lpb) {
  return lpb * 4;
}

/**
 * Parse a 16-character archetype string into events.
 * @param {string} notation - e.g. "----x-------x---"
 * @param {string} category - hat | clap | perc | bass | leadRhythm
 */
function parseArchetypeString(notation, category) {
  const map = SYMBOL_MAP[category];
  if (!map) return [];

  const text = notation.replace(/\s/g, '').slice(0, 16);
  const events = [];
  for (let pos = 0; pos < text.length; pos++) {
    const ch = text[pos];
    if (ch === '-') continue;
    const type = map[ch];
    if (type) events.push({ pos, type });
  }
  return events;
}

function sixteenthToLine(pos, bar, lpb) {
  const step = sixteenthStep(lpb);
  const barLines = barLineCount(lpb);
  return bar * barLines + pos * step;
}

function eventDensity(events) {
  return events.length / 16;
}

module.exports = {
  parseArchetypeString,
  sixteenthToLine,
  sixteenthStep,
  barLineCount,
  eventDensity,
  SYMBOL_MAP
};
