/**
 * Pad generator — long chord tones for breakdowns and builds.
 */

const { getChordAtBar } = require('./chord-engine');
const { barLengthLines } = require('./motif-generator');
const { parseNoteToSemitone, semitoneToRenoise, NON_MELODIC_OCTAVE } = require('../music-theory');
const { randomPercent } = require('../rng');

function withOctave(noteToken, octave) {
  const st = parseNoteToSemitone(noteToken);
  if (st == null) return noteToken;
  const pitch = ((st % 12) + 12) % 12;
  return semitoneToRenoise(octave * 12 + pitch);
}

function emptyCells(len) {
  return Array(len).fill('');
}

/**
 * Sustained root + fifth (+ third on builds) aligned to chord timeline.
 */
function generatePad(chordTimeline, globalBarOffset, trackLength, lpb, rng, options = {}) {
  const cells = emptyCells(trackLength);
  const barLen = barLengthLines(lpb);
  const { includeThird = false, octave = NON_MELODIC_OCTAVE } = options;
  const startBar = globalBarOffset;

  for (let line = 0; line < trackLength; line += barLen) {
    const bar = startBar + Math.floor(line / barLen);
    const chord = getChordAtBar(chordTimeline, bar);
    const root = withOctave(chord.rootNote, octave);
    const fifth = withOctave(chord.fifthNote, octave);

    cells[line] = root;
    const mid = line + (barLen / 2 | 0);
    if (mid < trackLength) cells[mid] = fifth;

    if (includeThird && randomPercent(60, rng)) {
      const third = withOctave(chord.thirdNote, octave);
      const thirdPos = line + (barLen / 4 | 0);
      if (thirdPos < trackLength) cells[thirdPos] = third;
    }
  }
  return cells;
}

module.exports = { generatePad };
