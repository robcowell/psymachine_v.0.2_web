/**
 * Parent motif — single melodic DNA for the entire track (90% rule).
 * Contour → scale degrees → rhythm → note tokens → cells last.
 */

const { pickContour, contourToDegrees } = require('./contour');
const {
  mutateMotif,
  transposeCells,
  reverseCells,
  octaveShiftCells,
  rhythmicShiftCells,
  barLengthLines,
  emptyCells
} = require('./motif-generator');
const { buildCounterpointVoice } = require('./counterpoint');
const { deriveSeed, seededRandom, randomPercent } = require('../rng');

/** Syncopated 16th positions within one bar (scaled to bar length). */
const PSY_HOOK_OFFSETS = [
  [2, 5, 8, 10, 13],
  [1, 4, 7, 11, 14],
  [3, 6, 9, 12, 15],
  [0, 4, 6, 10, 14]
];

function uniqueScaleNotes(melodyPool) {
  const seen = new Set();
  const out = [];
  for (const n of [melodyPool.baseNote, ...melodyPool.otherNotes]) {
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out.slice(0, 7);
}

function hookRhythm(noteCount, barLines, lpb, rng) {
  const template = PSY_HOOK_OFFSETS[(rng() * PSY_HOOK_OFFSETS.length) | 0];
  const scale = barLines / 16;
  const positions = [];
  for (let i = 0; i < noteCount; i++) {
    const base = template[i % template.length];
    let pos = Math.round(base * scale);
    if (i > 0 && randomPercent(35, rng)) {
      pos += Math.max(1, (lpb / 4) | 0);
    }
    positions.push(Math.min(barLines - 1, Math.max(0, pos)));
  }
  return positions;
}

function embellishDegrees(degrees, max, rng) {
  const out = [];
  for (let i = 0; i < degrees.length; i++) {
    out.push(degrees[i]);
    if (i < degrees.length - 1 && randomPercent(55, rng)) {
      const mid = Math.round((degrees[i] + degrees[i + 1]) / 2);
      out.push(Math.max(0, Math.min(max, mid)));
    }
  }
  return out.slice(0, degrees.length + 2);
}

/**
 * Render pitch+rhythm motif into line cells (notes generated last).
 */
function renderMotifEvents(pitchDegrees, rhythmOffsets, bars, lpb, scaleNotes, options = {}) {
  const rng = options.rng || (() => Math.random());
  const barLines = barLengthLines(lpb);
  const len = bars * barLines;
  const cells = emptyCells(len);
  const { octaveShift = 0, sparse = false, density = 1 } = options;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barLines;
    const count = sparse
      ? Math.max(1, Math.ceil(pitchDegrees.length * 0.4))
      : pitchDegrees.length;

    for (let i = 0; i < count; i++) {
      if (density < 1 && randomPercent((1 - density) * 100, rng)) continue;
      const deg = pitchDegrees[i % pitchDegrees.length];
      const note = scaleNotes[deg % scaleNotes.length];
      let pos = barStart + (rhythmOffsets[i % rhythmOffsets.length] || 0);
      if (sparse) pos = barStart + (i === 0 ? 0 : barLines / 2 | 0);
      if (pos < len) {
        let token = note;
        if (octaveShift) {
          const shifted = octaveShiftCells([token], octaveShift);
          token = shifted[0];
        }
        cells[pos] = token;
      }
    }
  }
  return cells;
}

/**
 * Generate the parent motif — one memorable idea for the whole song.
 */
function generateParentMotif(melodyPool, seedVal, lpb, rng) {
  const scaleNotes = uniqueScaleNotes(melodyPool);
  const maxDegree = scaleNotes.length - 1;
  const noteCount = 7 + ((rng() * 3) | 0);
  const contour = pickContour(rng);
  let pitchDegrees = contourToDegrees(contour.values, noteCount, maxDegree);
  pitchDegrees = embellishDegrees(pitchDegrees, maxDegree, rng);
  const barLines = barLengthLines(lpb);
  const rhythmOffsets = hookRhythm(pitchDegrees.length, barLines, lpb, rng);
  const noteTokens = pitchDegrees.map(d => scaleNotes[d % scaleNotes.length]);

  const bar2Degrees = shiftDegrees(pitchDegrees, rng() < 0.5 ? 1 : -1, maxDegree);
  const bar2Rhythm = rhythmOffsets.map(r => Math.min(barLines - 1, r + Math.max(1, (lpb / 2) | 0)));

  const cells = renderMotifEvents(pitchDegrees, rhythmOffsets, 1, lpb, scaleNotes, { rng });
  const bar2Cells = renderMotifEvents(bar2Degrees, bar2Rhythm, 1, lpb, scaleNotes, { rng });
  const twoBarCells = [...cells.slice(0, barLines), ...bar2Cells.slice(0, barLines)];

  return {
    pitchDegrees,
    rhythmOffsets,
    noteTokens,
    noteCount: pitchDegrees.length,
    contour: contour.name,
    tension: contour.tension,
    bars: 2,
    cells: twoBarCells,
    scaleNotes
  };
}

function shiftDegrees(degrees, amount, max) {
  return degrees.map(d => Math.max(0, Math.min(max, d + amount)));
}

function reverseDegrees(degrees) {
  return degrees.slice().reverse();
}

/**
 * Derive motif family from parent only (90% rule — no independent melodies).
 */
function deriveMotifFamily(parent, seedVal, lpb) {
  const rng = seededRandom(deriveSeed(seedVal, 'motif-family'));
  const { pitchDegrees, rhythmOffsets, scaleNotes, cells: parentCells } = parent;
  const max = scaleNotes.length - 1;
  const notes = scaleNotes;

  const A = renderMotifEvents(pitchDegrees, rhythmOffsets, 1, lpb, scaleNotes, { rng });
  const A_prime_deg = shiftDegrees(pitchDegrees, rng() < 0.5 ? 1 : 0, max);
  const A_prime = renderMotifEvents(
    A_prime_deg,
    rhythmOffsets.map(r => r + Math.max(1, (lpb / 8) | 0)),
    1,
    lpb,
    scaleNotes,
    { rng }
  );
  const B = renderMotifEvents(reverseDegrees(pitchDegrees), rhythmOffsets, 1, lpb, scaleNotes, { rng });
  const A_double_prime = octaveShiftCells(
    renderMotifEvents(pitchDegrees, rhythmOffsets, 1, lpb, scaleNotes, { rng }),
    1
  );

  let response = reverseCells(parentCells);
  response = transposeCells(response, [2, 3, 5, 7][(rng() * 4) | 0]);

  const sequenceRhythm = [];
  const sixteenth = Math.max(1, (lpb / 4) | 0);
  for (let i = 0; i < pitchDegrees.length * 2; i++) {
    sequenceRhythm.push(i * sixteenth);
  }
  const sequence = renderMotifEvents(
    [...pitchDegrees, ...pitchDegrees],
    sequenceRhythm,
    1,
    lpb,
    scaleNotes,
    { density: 0.85, rng }
  );

  const atmospheric = renderMotifEvents(pitchDegrees, [0], 1, lpb, scaleNotes, { sparse: true, rng });
  const halftime = renderMotifEvents(pitchDegrees, [0], 2, lpb, scaleNotes, { sparse: true, rng });
  const simplified_deg = pitchDegrees.slice(0, Math.max(3, Math.ceil(pitchDegrees.length / 2)));
  const simplified = renderMotifEvents(simplified_deg, [0], 1, lpb, scaleNotes, { sparse: true, rng });
  const octave_layer = renderMotifEvents(pitchDegrees, rhythmOffsets, 1, lpb, scaleNotes, { octaveShift: 1, rng });
  const rhythmic = rhythmicShiftCells(mutateMotif(A, notes, lpb, rng, 0.12), Math.max(1, (lpb / 4) | 0));
  const counterpoint = buildCounterpointVoice(parent, lpb, rng);

  const A2 = twoBarSlice(parent.cells, lpb) || A;

  return {
    A: A2,
    "A'": A_prime,
    B,
    "A''": A_double_prime,
    response,
    original: A,
    rhythmic,
    halftime,
    octave_layer,
    simplified,
    sequence,
    atmospheric,
    counter: counterpoint,
    counterpoint
  };
}

function twoBarSlice(cells, lpb) {
  const barLines = barLengthLines(lpb);
  const need = barLines * 2;
  if (!cells || cells.length < need) return null;
  return cells.slice(0, need);
}

function phaseToVariant(phase) {
  const map = {
    original: 'A',
    sparse: 'atmospheric',
    rhythmic: 'rhythmic',
    halftime: 'halftime',
    octave_layer: 'octave_layer',
    simplified: 'simplified',
    peak: 'sequence'
  };
  return map[phase] || 'A';
}

module.exports = {
  generateParentMotif,
  deriveMotifFamily,
  renderMotifEvents,
  phaseToVariant,
  uniqueScaleNotes
};
