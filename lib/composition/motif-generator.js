/**
 * Motif generation and transformations — 4-bar recognisable phrases with mutation.
 */

const { parseNoteToSemitone, semitoneToRenoise } = require('../music-theory');
const { randomPercent, deriveSeed, seededRandom } = require('../rng');

function barLengthLines(lpb) {
  return lpb * 4;
}

function motifLengthLines(bars, lpb) {
  return bars * barLengthLines(lpb);
}

function emptyCells(len) {
  return Array(len).fill('');
}

function pickNote(notes, rng) {
  return notes[(rng() * notes.length) | 0];
}

/** Simple contour: start mid, move up or down, return toward root. */
function pickContourNotes(notes, count, rng) {
  if (notes.length <= count) return notes.slice();
  const out = [notes[0]];
  let idx = 0;
  const dir = rng() < 0.5 ? 1 : -1;
  for (let i = 1; i < count; i++) {
    idx = Math.max(0, Math.min(notes.length - 1, idx + dir * (1 + (rng() * 2 | 0))));
    out.push(notes[idx]);
  }
  return out;
}

/**
 * Generate a sparse motif on a 16th grid.
 */
function generateMotifCells(notes, bars, lpb, rng, options = {}) {
  const len = motifLengthLines(bars, lpb);
  const cells = emptyCells(len);
  const sixteenth = Math.max(1, Math.floor(lpb / 4));
  const { density = 0.35, maxNotesPerBar = 6 } = options;
  const notesPerBar = Math.max(1, Math.min(maxNotesPerBar, Math.ceil(density * 16)));
  const contour = pickContourNotes(notes, Math.min(8, notes.length), rng);
  let ci = 0;

  for (let bar = 0; bar < bars; bar++) {
    const barStart = bar * barLengthLines(lpb);
    const placed = [];
    for (let n = 0; n < notesPerBar; n++) {
      const pos = barStart + ((rng() * (barLengthLines(lpb) / sixteenth)) | 0) * sixteenth;
      if (!placed.includes(pos)) {
        placed.push(pos);
        cells[pos] = contour[ci % contour.length];
        ci++;
      }
    }
  }
  return cells;
}

function generateDenseSequence(notes, bars, lpb, rng) {
  const len = motifLengthLines(bars, lpb);
  const cells = emptyCells(len);
  const sixteenth = Math.max(1, Math.floor(lpb / 4));
  for (let i = 0; i < len; i += sixteenth) {
    if (randomPercent(75, rng)) cells[i] = pickNote(notes, rng);
  }
  return cells;
}

function generateAtmospheric(notes, bars, lpb, rng) {
  const len = motifLengthLines(bars, lpb);
  const cells = emptyCells(len);
  const barLen = barLengthLines(lpb);
  for (let bar = 0; bar < bars; bar++) {
    const pos = bar * barLen;
    if (pos < len) cells[pos] = pickNote(notes.slice(0, 5), rng);
    const hold = pos + barLen / 2;
    if (hold < len && randomPercent(50, rng)) cells[hold | 0] = 'OFF';
  }
  return cells;
}

function transposeCells(cells, semitones) {
  if (!semitones) return cells.slice();
  return cells.map(c => {
    if (!c || c === 'OFF') return c;
    const st = parseNoteToSemitone(c);
    if (st == null) return c;
    return semitoneToRenoise(st + semitones);
  });
}

function invertCells(cells, axisSemitone) {
  return cells.map(c => {
    if (!c || c === 'OFF') return c;
    const st = parseNoteToSemitone(c);
    if (st == null) return c;
    return semitoneToRenoise(axisSemitone + (axisSemitone - st));
  });
}

function reverseCells(cells) {
  const notes = cells.filter(c => c && c !== 'OFF');
  const out = cells.slice();
  let ni = notes.length - 1;
  for (let i = 0; i < out.length; i++) {
    if (out[i] && out[i] !== 'OFF') {
      out[i] = notes[ni];
      ni--;
    }
  }
  return out;
}

function rotateCells(cells, amount) {
  const len = cells.length;
  const out = emptyCells(len);
  for (let i = 0; i < len; i++) {
    out[(i + amount + len) % len] = cells[i];
  }
  return out;
}

function rhythmicShiftCells(cells, shift) {
  const out = emptyCells(cells.length);
  for (let i = 0; i < cells.length; i++) {
    const t = i + shift;
    if (t >= 0 && t < cells.length) out[t] = cells[i];
  }
  return out;
}

function octaveShiftCells(cells, octaves) {
  const delta = octaves * 12;
  return transposeCells(cells, delta);
}

function deleteRandomNotes(cells, rng) {
  const out = cells.slice();
  for (let i = 0; i < out.length; i++) {
    if (out[i] && out[i] !== 'OFF' && randomPercent(25, rng)) out[i] = '';
  }
  return out;
}

function insertRandomNotes(cells, notes, rng) {
  const out = cells.slice();
  const sixteenth = 4;
  for (let i = 0; i < out.length; i += sixteenth) {
    if (!out[i] && randomPercent(20, rng)) out[i] = pickNote(notes, rng);
  }
  return out;
}

const TRANSFORMS = [
  { name: 'transpose', fn: (c, rng, notes) => transposeCells(c, [0, 2, 3, 5, 7][(rng() * 5) | 0]) },
  { name: 'invert', fn: (c, rng, notes) => {
    const root = parseNoteToSemitone(notes[0]) || 60;
    return invertCells(c, root + 12);
  }},
  { name: 'reverse', fn: (c) => reverseCells(c) },
  { name: 'rotate', fn: (c, rng) => rotateCells(c, ((rng() * 8) | 0) + 1) },
  { name: 'rhythmicShift', fn: (c, rng, notes, lpb) => rhythmicShiftCells(c, Math.max(1, (lpb / 4) | 0)) },
  { name: 'octaveShift', fn: (c, rng) => octaveShiftCells(c, rng() < 0.5 ? 1 : -1) },
  { name: 'deleteNote', fn: (c, rng) => deleteRandomNotes(c, rng) },
  { name: 'insertNote', fn: (c, rng, notes) => insertRandomNotes(c, notes, rng) }
];

/**
 * Mutate motif while keeping it recognisable (10–20% of transforms applied).
 */
function mutateMotif(cells, notes, lpb, rng, mutationRate = 0.15) {
  let out = cells.slice();
  for (const t of TRANSFORMS) {
    if (randomPercent(mutationRate * 100, rng)) {
      out = t.fn(out, rng, notes, lpb);
    }
  }
  return out;
}

function tileMotifToLength(motifCells, trackLength, rng, mutationRate, notes, lpb) {
  const out = emptyCells(trackLength);
  const motifLen = motifCells.length;
  if (motifLen <= 0) return out;

  for (let pos = 0; pos < trackLength; pos += motifLen) {
    let slice = mutateMotif(motifCells, notes, lpb, rng, mutationRate);
    for (let i = 0; i < motifLen && pos + i < trackLength; i++) {
      if (slice[i]) out[pos + i] = slice[i];
    }
  }
  return out;
}

/**
 * Call-and-response: question = first half, answer = second half of each phrase.
 * Uses 4-bar phrases when the pattern is long enough, otherwise 2-bar (or 1-bar).
 */
function applyPhraseRole(cells, lpb, role) {
  const barLen = barLengthLines(lpb);
  const patternBars = Math.max(1, Math.round(cells.length / barLen));
  const phraseBars = patternBars >= 4 ? 4 : patternBars >= 2 ? 2 : 1;
  const phraseLen = phraseBars * barLen;
  const half = phraseLen / 2;
  const out = cells.slice();

  for (let p = 0; p < out.length; p += phraseLen) {
    const start = role === 'question' ? p + half : p;
    const end = role === 'question' ? p + phraseLen : p + half;
    for (let i = start; i < end && i < out.length; i++) out[i] = '';
  }
  return out;
}

/**
 * Generate hook, sequence, atmospheric, and counter motifs for a song.
 */
function generateMotifSet(melodyPool, seedVal, lpb, style, rng) {
  const notes = [melodyPool.baseNote, ...melodyPool.otherNotes].filter(Boolean);
  const [minN, maxN] = style?.leadNotesPerBar || [4, 12];
  const hookRng = seededRandom(deriveSeed(seedVal, 'motif-hook'));
  const seqRng = seededRandom(deriveSeed(seedVal, 'motif-seq'));
  const atmoRng = seededRandom(deriveSeed(seedVal, 'motif-atmo'));
  const counterRng = seededRandom(deriveSeed(seedVal, 'motif-counter'));

  const hook = generateMotifCells(notes, 4, lpb, hookRng, {
    density: 0.3,
    maxNotesPerBar: Math.min(6, maxN)
  });
  const sequence = generateDenseSequence(notes, 2, lpb, seqRng);
  const atmospheric = generateAtmospheric(notes, 4, lpb, atmoRng);
  let counter = mutateMotif(hook, notes, lpb, counterRng, 0.18);
  counter = transposeCells(counter, 7);

  return {
    hook: { cells: hook, bars: 4, type: 'hook' },
    sequence: { cells: sequence, bars: 2, type: 'sequence' },
    atmospheric: { cells: atmospheric, bars: 4, type: 'atmospheric' },
    counter: { cells: counter, bars: 4, type: 'counter' }
  };
}

module.exports = {
  generateMotifSet,
  generateMotifCells,
  mutateMotif,
  tileMotifToLength,
  applyPhraseRole,
  transposeCells,
  reverseCells,
  invertCells,
  octaveShiftCells,
  rhythmicShiftCells,
  emptyCells,
  barLengthLines,
  motifLengthLines
};
