/**
 * Scale and chord data (server-side). Ported from scale.lua / public/scale-data.js.
 * Note indices 1–12: A, A#, B, C, C#, D, D#, E, F, F#, G, G#.
 */

const notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
const keyToRoot = { A: 1, 'A#': 2, B: 3, C: 4, 'C#': 5, D: 6, 'D#': 7, E: 8, F: 9, 'F#': 10, G: 11, 'G#': 12 };

const scales = [
  { name: 'Major', pattern: '101011010101' },
  { name: 'Natural Minor', pattern: '101101011010' },
  { name: 'Harmonic Minor', pattern: '101101011001' },
  { name: 'Melodic Minor', pattern: '101101010101' },
  { name: 'Pentatonic Major', pattern: '101001010100' },
  { name: 'Pentatonic Minor', pattern: '100101010010' },
  { name: 'Pentatonic Blues', pattern: '100101110010' },
  { name: 'Pentatonic Neutral', pattern: '101001010010' },
  { name: 'Ionian', pattern: '101011010101' },
  { name: 'Aeolian', pattern: '101101011010' },
  { name: 'Dorian', pattern: '101101010110' },
  { name: 'Mixolydian', pattern: '101011010110' },
  { name: 'Phrygian', pattern: '110101011010' },
  { name: 'Lydian', pattern: '101010110101' },
  { name: 'Locrian', pattern: '110101101010' },
  { name: 'Dim half', pattern: '110110110110' },
  { name: 'Dim whole', pattern: '101101101101' },
  { name: 'Whole', pattern: '101010101010' },
  { name: 'Augmented', pattern: '100110011001' },
  { name: 'Roumanian Minor', pattern: '101100110110' },
  { name: 'Spanish Gypsy', pattern: '110011011010' },
  { name: 'Blues', pattern: '100101110010' },
  { name: 'Diatonic', pattern: '101010010100' },
  { name: 'Double Harmonic', pattern: '110011011001' },
  { name: 'Eight Tone Spanish', pattern: '110111101010' },
  { name: 'Enigmatic', pattern: '110010101011' },
  { name: 'Leading Whole Tone', pattern: '101010101110' },
  { name: 'Lydian Augmented', pattern: '101010101101' },
  { name: 'Neopolitan Major', pattern: '110101010101' },
  { name: 'Neopolitan Minor', pattern: '110101011010' },
  { name: 'Pelog', pattern: '110100100011' },
  { name: 'Prometheus', pattern: '101010100110' },
  { name: 'Prometheus Neopolitan', pattern: '110010100110' },
  { name: 'Six Tone Symmetrical', pattern: '110011001100' },
  { name: 'Super Locrian', pattern: '110110101010' },
  { name: 'Lydian Minor', pattern: '101010111010' },
  { name: 'Lydian Diminished', pattern: '101100111010' },
  { name: 'Nine Tone Scale', pattern: '101110111101' },
  { name: 'Auxiliary Diminished', pattern: '101101101101' },
  { name: 'Auxiliary Augmented', pattern: '101010101010' },
  { name: 'Auxiliary Diminished Blues', pattern: '110110110110' },
  { name: 'Major Locrian', pattern: '101011101010' },
  { name: 'Overtone', pattern: '101010110110' },
  { name: 'Diminished Whole Tone', pattern: '110110101010' },
  { name: 'Pure Minor', pattern: '101101011010' },
  { name: 'Dominant 7th', pattern: '101001010110' }
];

const chords = [
  { name: 'Major', code: 'maj', pattern: '10001001' },
  { name: 'Minor', code: 'min', pattern: '10010001' },
  { name: 'Augmented', code: 'aug', pattern: '100010001' },
  { name: 'Diminished', code: 'dim', pattern: '1001001' },
  { name: 'suspended second', code: 'sus2', pattern: '10100001' },
  { name: 'suspended fourth', code: 'sus4', pattern: '10000101' },
  { name: 'sixth', code: 'maj6', pattern: '1000100101' },
  { name: 'minor sixth', code: 'min6', pattern: '1001000101' },
  { name: 'seventh', code: '7', pattern: '10001001001' },
  { name: 'major seventh', code: 'maj7', pattern: '100010010001' },
  { name: 'minor seventh', code: 'min7', pattern: '10010001001' },
  { name: 'minor/major seventh', code: 'min/maj7', pattern: '100100010001' },
  { name: 'diminished seventh', code: 'dim7', pattern: '1001001001' },
  { name: 'half-diminished', code: 'min7b5', pattern: '10010010001' },
  { name: 'seventh diminished fifth', code: '7b5', pattern: '10001010001' },
  { name: 'seventh augmented fifth', code: '7#5', pattern: '10001000101' },
  { name: 'major seventh diminished fifth', code: 'maj7b5', pattern: '100010100001' },
  { name: 'major seventh augmented fifth', code: 'maj7#5', pattern: '100010001001' },
  { name: 'seventh suspended fourth', code: '7sus4', pattern: '10000101001' },
  { name: 'seventh suspended fourth augmented fifth', code: '7sus4#5', pattern: '10000100101' }
];

function getNote(note) {
  return ((note - 1) % 12) + 1;
}

function getNname(note) {
  return notes[getNote(note) - 1];
}

function getScalePattern(root, scale) {
  const spat = scale.pattern;
  const rpat = Array(13).fill(false);
  for (let i = 0; i < spat.length; i++) {
    const note = ((root - 1 + i) % 12) + 1;
    if (spat[i] === '1') rpat[note] = true;
  }
  return rpat;
}

function getScaleNotes(root, scale) {
  const out = [];
  for (let i = 0; i < scale.pattern.length; i++) {
    const note = ((root - 1 + i) % 12) + 1;
    if (scale.pattern[i] === '1') out.push(getNname(note));
  }
  return out;
}

function getScaleDegreeIndices(root, scale) {
  const out = [];
  for (let i = 0; i < scale.pattern.length && out.length < 7; i++) {
    const note = ((root - 1 + i) % 12) + 1;
    if (scale.pattern[i] === '1') out.push(note);
  }
  return out;
}

function findScaleByName(name) {
  return scales.find(s => s.name === name) || scales[0];
}

function findScaleByIndex(idx) {
  return scales[idx] || scales[0];
}

function findChordIndexByCode(code) {
  const idx = chords.findIndex((c) => c.code === code);
  return idx >= 0 ? idx : 0;
}

function isChordInScale(chordRootNote, chordIdx, scalePattern) {
  const c = chords[chordIdx];
  if (!c) return false;
  for (let i = 0; i < c.pattern.length; i++) {
    if (c.pattern[i] !== '1') continue;
    const note = ((chordRootNote - 1 + i) % 12) + 1;
    if (!scalePattern[note]) return false;
  }
  return true;
}

/** Pitch-class names for one chord type rooted on chordRootNote (1–12). */
function getChordNoteNames(chordRootNote, chordIdx) {
  const c = chords[chordIdx];
  if (!c) return [];
  const out = [];
  for (let i = 0; i < c.pattern.length; i++) {
    if (c.pattern[i] === '1') {
      const note = ((chordRootNote - 1 + i) % 12) + 1;
      out.push(getNname(note));
    }
  }
  return out;
}

function getChordLabel(chordRootNote, chordIdx) {
  const c = chords[chordIdx];
  if (!c) return getNname(chordRootNote);
  const rootName = getNname(chordRootNote);
  if (c.code === 'maj') return rootName;
  if (c.code === 'min') return rootName + 'min';
  return rootName + c.code;
}

/**
 * Pick the first chord type from preferredCodes that fits the scale, else any valid type.
 */
function pickValidChordType(chordRootNote, scalePattern, preferredCodes) {
  const prefs = preferredCodes || ['maj'];
  for (const code of prefs) {
    const idx = findChordIndexByCode(code);
    if (isChordInScale(chordRootNote, idx, scalePattern)) return idx;
  }
  for (let c = 0; c < chords.length; c++) {
    if (isChordInScale(chordRootNote, c, scalePattern)) return c;
  }
  return findChordIndexByCode('maj');
}

/** Chord picker grid — valid types per scale degree. */
function getValidChordsForScale(root, scale) {
  const scalePattern = getScalePattern(root, scale);
  const degreeIndices = getScaleDegreeIndices(root, scale);
  const roman = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii'];
  return degreeIndices.map((chordRootNote, d) => {
    const chordsInDegree = [];
    for (let c = 0; c < chords.length; c++) {
      if (isChordInScale(chordRootNote, c, scalePattern)) {
        chordsInDegree.push({
          roman: roman[d],
          label: getChordLabel(chordRootNote, c),
          chordRootNote,
          chordIdx: c
        });
      }
    }
    return { roman: roman[d], chords: chordsInDegree };
  });
}

module.exports = {
  notes,
  keyToRoot,
  scales,
  chords,
  getScaleNotes,
  getScalePattern,
  getScaleDegreeIndices,
  getNname,
  findScaleByName,
  findScaleByIndex,
  findChordIndexByCode,
  isChordInScale,
  getChordNoteNames,
  getChordLabel,
  pickValidChordType,
  getValidChordsForScale
};
