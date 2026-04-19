/**
 * Psymachine generator logic - ported from C++ (generator.cpp)
 * Generates Renoise pattern XML from note/percent/parameter inputs.
 */

// Parameter indices (from parameterindex.h)
const iBaseNote = 0, iOtherNotes = 1, maxNoteInputFields = 2;
const iBaseNoteP = 0, iOtherNotesP = 1, iRemoveNoteP = 2, iAddNoteP = 3, iChangeNoteP = 4,
  iNoteOffP = 5, iNoteOffVariationP = 6, iNoteFlutterP = 7, maxPercentsInputFields = 8;
const iTrackLen = 0, iArpeggioLen = 1, iInstrumentNumber = 2, iTicksPerBeat = 3, iSeed = 4, maxOtherVarInputFields = 5;
const iNoteOffOnBeat = 5, iNoteOnFirstTick = 6, iCheckButtonEnd = 7;

function superTrim(input) {
  if (!input || typeof input !== 'string') return '';
  let startPos = 0;
  while (startPos < input.length && input[startPos] === ' ') startPos++;
  let endPos = input.length - 1;
  while (endPos > startPos && input[endPos] === ' ') endPos--;
  endPos++;
  let temp = '';
  for (let a = startPos; a < endPos; a++) {
    temp += input[a];
    if (input[a] === ' ') {
      a++;
      while (a < endPos && input[a] === ' ') a++;
      a--;
    }
  }
  return temp;
}

function randomPercent(percent, rng) {
  if (percent >= 100) return true;
  if (percent <= 0) return false;
  return (rng() * 100 | 0) + 1 <= percent;
}

/**
 * Renoise note tokens: naturals E-4; accidentals G#4. NFKC fixes fullwidth chars; X# + non-digit tail → X#4.
 */
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
  m = t.match(/^([A-G])-([A-G])$/);
  if (m) return m[1] + '-4';
  m = t.match(/^([A-G]#)(.*)$/);
  if (m) {
    const rest = m[2];
    if (/^\d+$/.test(rest)) return m[1] + '#' + rest;
    return m[1] + '#4';
  }
  m = t.match(/^([A-G])-(.*)$/);
  if (m) {
    const rest = m[2];
    if (/^\d+$/.test(rest)) return m[1] + '-' + rest;
    return m[1] + '-4';
  }
  return 'C-4';
}

function parseNotes(input) {
  const trimmed = superTrim(input);
  if (trimmed.length === 0) return [];
  return trimmed.split(/\s+/).map(s => normalizeRenoiseNoteToken(s)).filter(Boolean);
}

/**
 * Build a seeded RNG (simple LCG)
 */
function seededRandom(seed) {
  let s = Math.imul(seed, 1) || 0;
  if (s <= 0) s = (Date.now() & 0x7fffffff);
  return function () {
    s = Math.imul(48271, s) >>> 0;
    return (s & 0x7fffffff) / 0x7fffffff;
  };
}

/**
 * @param {Object} params - All input params (notes, percents, otherVar, checkboxes)
 * @returns {{ xml: string, error?: string }}
 */
function generate(params) {
  const {
    baseNote,
    otherNotes,
    baseNoteP, otherNotesP, removeNoteP, addNoteP, changeNoteP,
    noteOffP, noteOffVariationP, noteFlutterP,
    trackLen, arpeggioLen, instrumentNumber, ticksPerBeat, seed,
    noteOffOnBeat, noteOnFirstTick
  } = params;

  const notesStr = (baseNote || '').trim() + ' ' + (otherNotes || '').trim();
  const notes = parseNotes(notesStr).map(n => normalizeRenoiseNoteToken(n)).filter(Boolean);
  if (notes.length === 0) return { error: 'Base note is required.' };

  const percents = [
    parseInt(baseNoteP, 10) || 0,
    parseInt(otherNotesP, 10) || 0,
    parseInt(removeNoteP, 10) || 0,
    parseInt(addNoteP, 10) || 0,
    parseInt(changeNoteP, 10) || 0,
    parseInt(noteOffP, 10) || 0,
    parseInt(noteOffVariationP, 10) || 0,
    parseInt(noteFlutterP, 10) || 0
  ];

  let trackLength = parseInt(trackLen, 10) || 64;
  let arpLen = parseInt(arpeggioLen, 10) || 16;
  const instRaw = String(instrumentNumber ?? '0').trim();
  /** Renoise clipboard uses 2-char hex instrument ids (e.g. 00, 0B). */
  function instrumentToHex2(raw) {
    if (!raw) return '00';
    const n = /^[0-9]+$/.test(raw) ? parseInt(raw, 10) : parseInt(raw, 16);
    const v = Number.isFinite(n) ? Math.max(0, Math.min(255, n)) : 0;
    return v.toString(16).toUpperCase().padStart(2, '0');
  }
  const instHex = instrumentToHex2(instRaw);
  let ticksPerB = parseInt(ticksPerBeat, 10) || 8;
  const seedVal = parseInt(seed, 10) || 0;

  if (arpLen > trackLength) arpLen = trackLength;
  if (ticksPerB < 1) ticksPerB = 1;

  const noteTickAdd = Math.max(1, Math.floor(ticksPerB / 4));
  const maxNotes = notes.length;
  const rng = seededRandom(seedVal);

  /** When only base note exists, (rng()*(maxNotes-1)|0)+1 always read notes[1] → undefined; broke cells past arpeggio. */
  function pickOtherNoteIndex() {
    if (maxNotes <= 1) return 0;
    return (rng() * (maxNotes - 1) | 0) + 1;
  }

  const track = Array(trackLength).fill('');

  function genRandomNote(trackPos) {
    if ((rng() * 2 | 0) === 0) {
      if (randomPercent(percents[iBaseNoteP], rng)) track[trackPos] = notes[0];
      else if (randomPercent(percents[iOtherNotesP], rng)) track[trackPos] = notes[pickOtherNoteIndex()];
    } else {
      if (randomPercent(percents[iOtherNotesP], rng)) track[trackPos] = notes[pickOtherNoteIndex()];
      else if (randomPercent(percents[iBaseNoteP], rng)) track[trackPos] = notes[0];
    }
  }

  function forceGenRandomNote(trackPos) {
    if ((rng() * 2 | 0) === 0) {
      if (randomPercent(percents[iBaseNoteP], rng)) track[trackPos] = notes[0];
      else track[trackPos] = notes[pickOtherNoteIndex()];
    } else {
      if (randomPercent(percents[iOtherNotesP], rng)) track[trackPos] = notes[pickOtherNoteIndex()];
      else track[trackPos] = notes[0];
    }
  }

  // noteOnFirstTick
  forceGenRandomNote(0);
  if (!noteOnFirstTick) track[0] = '';

  // randomizeArpeggioNotes
  for (let a = 0; a < arpLen; a += noteTickAdd) genRandomNote(a);

  // randomizeNoteOffs
  for (let a = 0; a < arpLen; a++) {
    if (track[a] === '' && randomPercent(percents[iNoteOffP], rng)) track[a] = 'OFF';
  }

  // copyArpeggioToWholeTrack
  for (let a = arpLen, b = 0; a < trackLength; a++, b++) track[a] = track[b];

  // randomizeVariations
  for (let a = arpLen; a < trackLength; a += noteTickAdd) {
    if (track[a] !== '' && track[a] !== 'OFF') {
      if (randomPercent(percents[iChangeNoteP], rng)) forceGenRandomNote(a);
      if (randomPercent(percents[iRemoveNoteP], rng)) track[a] = '';
    } else if (randomPercent(percents[iAddNoteP], rng)) forceGenRandomNote(a);
  }
  for (let a = arpLen; a < trackLength; a++) {
    if (track[a] === '' && randomPercent(percents[iNoteOffVariationP], rng)) track[a] = 'OFF';
  }

  // randomizeNoteFlutter
  if (percents[iNoteFlutterP] !== 0) {
    let b = percents[iNoteFlutterP];
    let c = (rng() * maxNotes | 0);
    for (let a = 0; a < trackLength; a += noteTickAdd) {
      if (randomPercent(b, rng)) {
        if ((rng() * 2 | 0) === 0) {
          track[a] = notes[c];
          b = 100;
          if (c >= (rng() * maxNotes | 0) + 2) { b = 50; c = (rng() * maxNotes | 0); }
          c++; if (c === maxNotes) c = maxNotes - 1;
        } else {
          track[a] = notes[c];
          b = 100;
          if (c <= (rng() * maxNotes | 0) - 2) { b = 50; c = (rng() * maxNotes | 0); }
          c--; if (c < 0) c = 0;
        }
      }
    }
  }

  // noteOffOnBeat
  if (noteOffOnBeat) {
    for (let a = 0; a < trackLength; a += ticksPerB) track[a] = 'OFF';
  }

  // deleteUselessNoteOffs
  for (let a = 0; a < trackLength; a++) {
    if (track[a] === 'OFF') {
      for (;;) {
        a++;
        if (a >= trackLength) break;
        if (track[a] === 'OFF' || track[a] === '') track[a] = '';
        else break;
      }
    }
  }

  // Build Renoise XML (matches current Renoise clipboard: Columns/Column + note + effect sub-columns)
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<PatternClipboard.BlockBuffer doc_version="0">\n';
  xml += '<Columns>\n<Column>\n<Column>\n<Lines>\n';
  for (let a = 0; a < trackLength; a++) {
    const cell = track[a];
    if (cell === '' || cell == null) {
      xml += '<Line/>\n';
    } else {
      xml += '<Line index="' + a + '">\n<NoteColumns>\n<NoteColumn>\n';
      const noteXml = normalizeRenoiseNoteToken(cell);
      xml += '<Note>' + noteXml + '</Note>\n';
      if (noteXml !== 'OFF') xml += '<Instrument>' + instHex + '</Instrument>\n';
      xml += '</NoteColumn>\n</NoteColumns>\n</Line>\n';
    }
  }
  xml += '</Lines>\n';
  xml += '<ColumnType>NoteColumn</ColumnType>\n';
  xml += '<SubColumnMask>true true true false false false false false</SubColumnMask>\n';
  xml += '</Column>\n<Column>\n<Lines>\n';
  for (let a = 0; a < trackLength; a++) {
    xml += '<Line/>\n';
  }
  xml += '</Lines>\n';
  xml += '<ColumnType>EffectColumn</ColumnType>\n';
  xml += '<SubColumnMask>false false false false false true true false</SubColumnMask>\n';
  xml += '</Column>\n</Column>\n</Columns>\n</PatternClipboard.BlockBuffer>\n';
  return { xml };
}

module.exports = { generate, parseNotes, superTrim };
