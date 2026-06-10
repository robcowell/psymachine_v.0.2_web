/**
 * Music theory helpers: Renoise note formatting, scale-aware note pools for generators.
 */

const { keyToRoot, getScaleNotes, getScaleDegreeIndices, getNname, findScaleByIndex } = require('./scale-data');

/** Renoise note tokens: naturals E-4; accidentals G#4. */
function normalizeRenoiseNoteToken(s) {
  if (s == null || s === '') return '';
  let t = String(s).trim().normalize('NFKC')
    .replace(/\u266f/gi, '#')
    .replace(/\uff03/g, '#')
    .toUpperCase();
  if (t === 'OFF') return 'OFF';
  if (/^([A-G])-(\d+)$/.test(t)) return t;
  if (/^([A-G]#)(\d+)$/.test(t)) return t;
  let m = t.match(/^([A-G]#)-(\d+)$/);
  if (m) return m[1] + m[2];
  if (/^([A-G]#)$/.test(t)) return t + '4';
  if (/^([A-G])$/.test(t)) return t + '-4';
  m = t.match(/^([A-G])-(.*)$/);
  if (m) {
    const rest = m[2];
    if (/^\d+$/.test(rest)) return m[1] + '-' + rest;
    return m[1] + '-4';
  }
  m = t.match(/^([A-G]#)(.*)$/);
  if (m) {
    const rest = m[2];
    if (/^\d+$/.test(rest)) return m[1] + rest;
    return m[1] + '4';
  }
  return 'C-4';
}

function formatRenoiseNote(noteName, octave) {
  const n = String(noteName).trim().replace(/\u266f/gi, '#').replace(/\uff03/g, '#');
  const oct = String(octave != null ? octave : 4);
  if (n.length === 1) return n + '-' + oct;
  return n + oct;
}

function parseNoteToSemitone(noteToken) {
  const t = normalizeRenoiseNoteToken(noteToken);
  if (t === 'OFF' || !t) return null;
  const m = t.match(/^([A-G]#?)-?(\d+)$/);
  if (!m) return null;
  const nameMap = { A: 0, 'A#': 1, B: 2, C: 3, 'C#': 4, D: 5, 'D#': 6, E: 7, F: 8, 'F#': 9, G: 10, 'G#': 11 };
  const pitch = nameMap[m[1]];
  if (pitch == null) return null;
  return parseInt(m[2], 10) * 12 + pitch;
}

function semitoneToRenoise(semitone) {
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const oct = Math.floor(semitone / 12);
  const pitch = ((semitone % 12) + 12) % 12;
  const name = names[pitch];
  if (name.length === 1) return name + '-' + oct;
  return name + oct;
}

function instrumentToHex2(raw) {
  if (raw == null || raw === '') return '00';
  const s = String(raw).trim();
  const n = /^[0-9]+$/.test(s) ? parseInt(s, 10) : parseInt(s, 16);
  const v = Number.isFinite(n) ? Math.max(0, Math.min(255, n)) : 0;
  return v.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Build melodic note pool from key + scale for lead/melody tracks.
 */
function getMelodyNotePool(keyName, scaleIdx, octaveHigh) {
  const root = keyToRoot[keyName];
  const scale = findScaleByIndex(parseInt(scaleIdx, 10) || 0);
  if (root == null || !scale) return { baseNote: 'C-4', otherNotes: [] };

  const scaleNotes = getScaleNotes(root, scale);
  const oct = parseInt(octaveHigh, 10) || 4;
  const formatted = scaleNotes.map(n => formatRenoiseNote(n, oct));
  const baseNote = formatted[0] || formatRenoiseNote(keyName, oct);

  const otherNotes = [];
  for (let o = oct; o <= oct + 2; o++) {
    scaleNotes.forEach(n => {
      const token = formatRenoiseNote(n, o);
      if (token !== baseNote) otherNotes.push(token);
    });
  }
  return { baseNote, otherNotes: [...new Set(otherNotes)], scale, root };
}

/** Base octave for drums, pads, and other non-lead elements. */
const NON_MELODIC_OCTAVE = 4;
/** Psy bass — one octave below drum triggers (kick C-4, etc.). */
const BASS_OCTAVE = 3;

/**
 * Bass note pool: root, fifth, and passing tones at BASS_OCTAVE.
 */
function getBassNotePool(keyName, scaleIdx) {
  const root = keyToRoot[keyName];
  const scale = findScaleByIndex(parseInt(scaleIdx, 10) || 0);
  const oct = BASS_OCTAVE;
  if (root == null || !scale) return { rootNote: 'E-3', fifthNote: 'B-3', passingNotes: [] };

  const degrees = getScaleDegreeIndices(root, scale);
  const rootIdx = degrees[0];
  const fifthIdx = degrees[4] || degrees[degrees.length - 1];
  const thirdIdx = degrees[2] || degrees[1];

  const rootNote = formatRenoiseNote(getNname(rootIdx), oct);
  const fifthNote = formatRenoiseNote(getNname(fifthIdx), oct);
  const thirdNote = formatRenoiseNote(getNname(thirdIdx), oct);

  const passingNotes = [
    rootNote,
    formatRenoiseNote(getNname(rootIdx), oct + 1),
    thirdNote,
    fifthNote,
    formatRenoiseNote(getNname(fifthIdx), oct + 1)
  ];
  return { rootNote, fifthNote, thirdNote, passingNotes: [...new Set(passingNotes)] };
}

/** Standard drum trigger notes at octave 4 (kick = C-4). */
const DRUM_TRIGGERS = {
  kick: 'C-4',
  snare: 'D-4',
  clap: 'E-4',
  hihatClosed: 'F#4',
  hihatOpen: 'A#4',
  ride: 'C#5',
  crash: 'G#4',
  fxImpact: 'C-5',
  fxRiser: 'G-5',
  fxSweep: 'D-5'
};

module.exports = {
  normalizeRenoiseNoteToken,
  formatRenoiseNote,
  parseNoteToSemitone,
  semitoneToRenoise,
  instrumentToHex2,
  getMelodyNotePool,
  getBassNotePool,
  DRUM_TRIGGERS,
  NON_MELODIC_OCTAVE,
  BASS_OCTAVE
};
