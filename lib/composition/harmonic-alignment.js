/**
 * Align melodic lines to the shared chord timeline — keeps lead, pad, and bass consonant.
 */

const { getChordAtBar } = require('./chord-engine');
const { barLengthLines } = require('./motif-generator');
const { normalizeRenoiseNoteToken } = require('../music-theory');

/** Pitch-class index — matches scale-data / formatRenoiseNote (A = 0). */
const PITCH_CLASS = {
  A: 0, 'A#': 1, B: 2, C: 3, 'C#': 4, D: 5, 'D#': 6, E: 7, F: 8, 'F#': 9, G: 10, 'G#': 11
};

function pitchName(noteToken) {
  const m = normalizeRenoiseNoteToken(noteToken).match(/^([A-G]#?)/);
  return m ? m[1] : null;
}

function noteOctave(noteToken) {
  const m = normalizeRenoiseNoteToken(noteToken).match(/^([A-G]#?)-?(\d+)$/);
  return m ? parseInt(m[2], 10) : 4;
}

function withOctave(noteToken, octave) {
  const name = pitchName(noteToken);
  if (!name) return noteToken;
  return name.length === 1 ? `${name}-${octave}` : `${name}${octave}`;
}

function chordTones(chord) {
  if (chord?.noteTokens?.length) return chord.noteTokens.filter(Boolean);
  return [chord.rootNote, chord.thirdNote, chord.fifthNote].filter(Boolean);
}

function pitchClassDistance(a, b) {
  if (a == null || b == null) return 99;
  const d = Math.abs(a - b);
  return Math.min(d, 12 - d);
}

/**
 * Nearest chord tone (root / 3rd / 5th) at the source note's octave.
 */
function snapToChordTone(noteToken, chord) {
  if (!noteToken || noteToken === 'OFF' || !chord) return noteToken;

  const notePc = PITCH_CLASS[pitchName(noteToken)];
  if (notePc == null) return noteToken;

  const oct = noteOctave(noteToken);
  let best = noteToken;
  let bestDist = Infinity;

  for (const tone of chordTones(chord)) {
    const tpc = PITCH_CLASS[pitchName(tone)];
    if (tpc == null) continue;
    const dist = pitchClassDistance(notePc, tpc);
    if (dist < bestDist) {
      bestDist = dist;
      best = withOctave(tone, oct);
    }
  }

  return best;
}

/**
 * Per-line snap to the chord active at that bar.
 */
function alignCellsToChordTimeline(cells, chordTimeline, globalBarOffset, lpb) {
  if (!chordTimeline?.changes?.length) return cells;

  const barLen = barLengthLines(lpb);
  return cells.map((note, line) => {
    if (!note || note === 'OFF') return note;
    const bar = globalBarOffset + Math.floor(line / barLen);
    const chord = getChordAtBar(chordTimeline, bar);
    return snapToChordTone(note, chord);
  });
}

/** Breakdown tease — one pitch per bar, always the current chord root in the note's register. */
function collapseToChordRoots(cells, chordTimeline, globalBarOffset, lpb) {
  if (!chordTimeline?.changes?.length) return cells;

  const barLen = barLengthLines(lpb);
  return cells.map((note, line) => {
    if (!note || note === 'OFF') return note;
    const bar = globalBarOffset + Math.floor(line / barLen);
    const chord = getChordAtBar(chordTimeline, bar);
    return withOctave(chord.rootNote, noteOctave(note));
  });
}

module.exports = {
  snapToChordTone,
  alignCellsToChordTimeline,
  collapseToChordRoots,
  chordTones,
  withOctave
};
