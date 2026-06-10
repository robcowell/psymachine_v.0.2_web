/**
 * Pad generator — sustained full voicings from the chord timeline / picker.
 */

const { getChordAtBar } = require('./chord-engine');
const { barLengthLines } = require('./motif-generator');
const { NON_MELODIC_OCTAVE } = require('../music-theory');
const { padVoicing } = require('../chord-voicing');

function emptyCells(len) {
  return Array(len).fill('');
}

/**
 * One chord per bar — all picker notes as simultaneous Renoise columns.
 */
function generatePad(chordTimeline, globalBarOffset, trackLength, lpb, options = {}) {
  const cells = emptyCells(trackLength);
  const barLen = barLengthLines(lpb);
  const { octave = NON_MELODIC_OCTAVE } = options;
  const startBar = globalBarOffset;

  for (let line = 0; line < trackLength; line += barLen) {
    const bar = startBar + Math.floor(line / barLen);
    const chord = getChordAtBar(chordTimeline, bar);
    const voicing = padVoicing(chord, octave);
    if (voicing.length) cells[line] = voicing;
  }
  return cells;
}

module.exports = { generatePad, chordVoicing: padVoicing };
