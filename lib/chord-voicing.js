/**
 * Full chord voicings from the scale/chord picker (maj, min7, sus4, dim7, …).
 */

const {
  keyToRoot,
  getScaleDegreeIndices,
  getScalePattern,
  getNname,
  findScaleByIndex,
  pickValidChordType,
  getChordLabel,
  findChordIndexByCode,
  getChordNoteNames,
  chords,
  isChordInScale
} = require('./scale-data');
const { formatRenoiseNote, NON_MELODIC_OCTAVE } = require('./music-theory');

/** Scale-degree → preferred chord codes for i VI III VII (aeolian/progressive). */
const PROGRESSION_DEGREE_PREFS = {
  0: ['min7', 'min', 'min6'],
  5: ['maj7', 'maj6', 'maj'],
  2: ['maj7', 'maj', 'maj6'],
  6: ['min7', 'min', 'min7b5', 'dim']
};

const CADENCE_TONIC_PREFS = ['min7', 'min'];
const CADENCE_DOMINANT_PREFS = ['7', 'maj7', 'maj'];

function scaleContext(keyName, scaleIdx) {
  const root = keyToRoot[keyName];
  const scale = findScaleByIndex(parseInt(scaleIdx, 10) || 0);
  if (root == null || !scale) return null;
  return {
    root,
    scale,
    scalePattern: getScalePattern(root, scale),
    degrees: getScaleDegreeIndices(root, scale)
  };
}

/**
 * Build a chord object with all picker note columns at the given octave.
 */
function buildChordVoicing(chordRootNote, chordIdx, octave = NON_MELODIC_OCTAVE, meta = {}) {
  const names = getChordNoteNames(chordRootNote, chordIdx);
  const noteTokens = names.map((n) => formatRenoiseNote(n, octave));
  return {
    ...meta,
    chordRootNote,
    chordIdx,
    chordCode: chords[chordIdx]?.code || 'maj',
    label: getChordLabel(chordRootNote, chordIdx),
    noteTokens,
    rootNote: noteTokens[0] || formatRenoiseNote(getNname(chordRootNote), octave),
    thirdNote: noteTokens[1] || noteTokens[0],
    fifthNote: noteTokens[2] || noteTokens[1] || noteTokens[0]
  };
}

function chordForScaleDegree(keyName, scaleIdx, degreeIndex, preferredCodes, meta = {}) {
  const ctx = scaleContext(keyName, scaleIdx);
  if (!ctx) {
    return buildChordVoicing(4, findChordIndexByCode('maj'), NON_MELODIC_OCTAVE, meta);
  }
  const chordRootNote = ctx.degrees[degreeIndex] || ctx.degrees[0];
  const chordIdx = pickValidChordType(chordRootNote, ctx.scalePattern, preferredCodes);
  return buildChordVoicing(chordRootNote, chordIdx, NON_MELODIC_OCTAVE, {
    degree: degreeIndex,
    ...meta
  });
}

function buildTonicCadenceChord(keyName, scaleIdx, meta = {}) {
  return chordForScaleDegree(keyName, scaleIdx, 0, CADENCE_TONIC_PREFS, { cadence: 'i', ...meta });
}

function buildDominantCadenceChord(keyName, scaleIdx, meta = {}) {
  const ctx = scaleContext(keyName, scaleIdx);
  if (!ctx) return buildTonicCadenceChord(keyName, scaleIdx, { cadence: 'V', ...meta });
  const vRoot = ctx.degrees[4] || ctx.degrees[0];
  const chordIdx = pickValidChordType(vRoot, ctx.scalePattern, CADENCE_DOMINANT_PREFS);
  return buildChordVoicing(vRoot, chordIdx, NON_MELODIC_OCTAVE, { degree: 4, cadence: 'V', ...meta });
}

function chordAtProgressionIndex(keyName, scaleIdx, progressionIndex, progressionDegrees) {
  const ctx = scaleContext(keyName, scaleIdx);
  if (!ctx) return buildChordVoicing(4, findChordIndexByCode('maj'), NON_MELODIC_OCTAVE);

  const degIdx = progressionDegrees[progressionIndex % progressionDegrees.length];
  const prefs = PROGRESSION_DEGREE_PREFS[degIdx] || ['maj', 'min7'];
  return chordForScaleDegree(keyName, scaleIdx, degIdx, prefs, { progressionIndex: progressionIndex % progressionDegrees.length });
}

/** All simultaneous pad columns for a chord timeline entry. */
function padVoicing(chord, octave = NON_MELODIC_OCTAVE) {
  if (chord?.noteTokens?.length) {
    return chord.noteTokens.slice();
  }
  if (!chord) return [];
  const names = [];
  if (chord.rootNote) names.push(chord.rootNote);
  if (chord.thirdNote && chord.thirdNote !== chord.rootNote) names.push(chord.thirdNote);
  if (chord.fifthNote && chord.fifthNote !== chord.thirdNote) names.push(chord.fifthNote);
  return [...new Set(names)].filter(Boolean);
}

function validatePickerChord(keyName, scaleIdx, chordRootNote, chordIdx) {
  const ctx = scaleContext(keyName, scaleIdx);
  if (!ctx) return false;
  return isChordInScale(chordRootNote, chordIdx, ctx.scalePattern);
}

module.exports = {
  PROGRESSION_DEGREE_PREFS,
  buildChordVoicing,
  chordForScaleDegree,
  buildTonicCadenceChord,
  buildDominantCadenceChord,
  chordAtProgressionIndex,
  padVoicing,
  validatePickerChord,
  scaleContext
};
