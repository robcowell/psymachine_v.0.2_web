/**
 * Counterpoint voice — harmonic + rhythmic complement to the parent motif (not a mirror).
 */

const { barLengthLines, emptyCells, octaveShiftCells } = require('./motif-generator');

function shiftDegrees(degrees, amount, max) {
  return degrees.map(d => Math.max(0, Math.min(max, d + amount)));
}

/** 16th-grid syncopation templates (offsets within one bar at LPB 4 → 16 lines). */
const PSY_RHYTHM_TEMPLATES = [
  [1, 3, 5, 6, 9, 10, 11, 14],
  [2, 4, 5, 7, 10, 11, 12, 15],
  [0, 3, 4, 5, 8, 9, 11, 13],
  [1, 2, 4, 6, 8, 9, 12, 14]
];

function pickRhythmTemplate(barLines, lpb, rng) {
  const scale = Math.max(1, barLines / 16);
  const template = PSY_RHYTHM_TEMPLATES[(rng() * PSY_RHYTHM_TEMPLATES.length) | 0];
  if (scale <= 1) return template;
  const out = [];
  template.forEach(t => {
    out.push(t);
    if (scale >= 2) out.push(Math.min(barLines - 1, t + (lpb | 0)));
  });
  return out.sort((a, b) => a - b);
}

/**
 * Place notes where the lead rests; use harmonic interval (3rd or 5th above).
 */
function buildCounterpointVoice(parent, lpb, rng) {
  const { pitchDegrees, scaleNotes, cells: leadCells } = parent;
  const max = scaleNotes.length - 1;
  const barLines = barLengthLines(lpb);
  const bars = 2;
  const len = bars * barLines;
  const out = emptyCells(len);

  const harmonyShift = rng() < 0.55 ? 2 : 4;
  const counterDegrees = shiftDegrees(pitchDegrees, harmonyShift, max);
  const rhythm = pickRhythmTemplate(barLines, lpb, rng);

  const leadBar = leadCells.slice(0, barLines);

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barLines;
    const barDeg = bar === 1 ? shiftDegrees(counterDegrees, rng() < 0.5 ? 1 : 0, max) : counterDegrees;

    for (let ri = 0; ri < rhythm.length; ri++) {
      const pos = barStart + rhythm[ri];
      if (pos >= len) continue;
      const local = pos - barStart;
      if (leadCells[pos] || leadBar[local]) continue;
      const deg = barDeg[ri % barDeg.length];
      let note = scaleNotes[deg % scaleNotes.length];
      const shifted = octaveShiftCells([note], 1);
      out[pos] = shifted[0];
    }
  }

  return out;
}

module.exports = {
  buildCounterpointVoice,
  PSY_RHYTHM_TEMPLATES
};
